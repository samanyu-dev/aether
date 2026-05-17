#!/usr/bin/env python3
import os
import json
import sys
import argparse
import http.server
import socketserver
import webbrowser
import threading
from glob import glob
from datetime import datetime

def find_static_dir():
    # 1. Check relative monorepo path (for local developer setup)
    dev_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "apps", "web", "out"))
    if os.path.exists(os.path.join(dev_path, "index.html")):
        return dev_path
    
    # 2. Check packaged path (for production site-packages installation)
    prod_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "ui"))
    if os.path.exists(os.path.join(prod_path, "index.html")):
        return prod_path
    
    return None

class AetherReplayHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        # Mute standard terminal logging of HTTP requests to keep developer output pristine
        pass

    def do_GET(self):
        # API 1: Discover all local traces
        if self.path == "/api/traces" or self.path == "/api/traces/":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            
            traces = []
            trace_files = glob(".aether/traces/*.json")
            for filepath in trace_files:
                try:
                    with open(filepath, "r") as f:
                        data = json.load(f)
                    traces.append({
                        "filename": os.path.basename(filepath),
                        "session_id": data.get("session_id", ""),
                        "agent_name": data.get("agent_name", ""),
                        "event_count": len(data.get("events", [])),
                        "timestamp": data.get("timestamp", "")
                    })
                except Exception:
                    pass
            # Sort traces chronologically (latest first)
            traces.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
            self.wfile.write(json.dumps(traces).encode("utf-8"))
            return
            
        # API 2: Load a specific trace content
        elif self.path.startswith("/api/traces/"):
            filename = self.path[len("/api/traces/"):]
            # Prevent directory traversal
            if "/" in filename or "\\" in filename:
                self.send_error(400, "Malformed request path")
                return
            filepath = os.path.join(".aether", "traces", filename)
            if not os.path.exists(filepath):
                self.send_error(404, f"Trace file {filename} not found")
                return
                
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            with open(filepath, "rb") as f:
                self.wfile.write(f.read())
            return
            
        # Fall back to local UI assets
        super().do_GET()

    def translate_path(self, path):
        static_dir = find_static_dir()
        if not static_dir:
            return super().translate_path(path)
        
        # Clean path of query parameters or fragments
        path = path.split("?")[0].split("#")[0]
        rel_path = path.lstrip("/")
        
        if not rel_path:
            rel_path = "index.html"
            
        target = os.path.join(static_dir, rel_path)
        
        # Single-page-app route fallback (for Next.js subroutes)
        if not os.path.exists(target) and "." not in rel_path:
            target = os.path.join(static_dir, "index.html")
            
        return target

def cmd_list(args):
    trace_files = glob(".aether/traces/*.json")
    if not trace_files:
        print("[Aether CLI] No local traces found. Instrument your agent with `AgentTracer` to write traces.")
        return
    
    print("\n🌌 AETHER LOCAL TRACES")
    print("=" * 80)
    print(f"{'TIMESTAMP':<25} | {'AGENT':<20} | {'SESSION ID':<25} | {'NODES':<6}")
    print("-" * 80)
    
    traces = []
    for filepath in trace_files:
        try:
            with open(filepath, "r") as f:
                data = json.load(f)
            traces.append({
                "session_id": data.get("session_id", ""),
                "agent_name": data.get("agent_name", ""),
                "event_count": len(data.get("events", [])),
                "timestamp": data.get("timestamp", "")
            })
        except Exception:
            pass
            
    # Newest traces first
    traces.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    
    for t in traces:
        try:
            dt = datetime.fromisoformat(t["timestamp"].replace("Z", "+00:00"))
            time_str = dt.strftime("%Y-%m-%d %H:%M:%S")
        except Exception:
            time_str = t["timestamp"][:19]
            
        print(f"{time_str:<25} | {t['agent_name'][:20]:<20} | {t['session_id'][:25]:<25} | {t['event_count']:<6}")
    print("=" * 80)
    print(f"Run `aether replay` to start the visualizer dashboard.\n")

def cmd_inspect(args):
    trace_files = glob(".aether/traces/*.json")
    target_file = None
    
    if args.session_id:
        for tf in trace_files:
            if args.session_id in tf:
                target_file = tf
                break
    else:
        # Load latest
        traces = []
        for tf in trace_files:
            try:
                with open(tf, "r") as f:
                    data = json.load(f)
                traces.append((tf, data.get("timestamp", "")))
            except Exception:
                pass
        if traces:
            traces.sort(key=lambda x: x[1], reverse=True)
            target_file = traces[0][0]
            
    if not target_file:
        print(f"[Aether CLI] Target trace file not found.")
        return
        
    try:
        with open(target_file, "r") as f:
            data = json.load(f)
    except Exception as e:
        print(f"[Aether CLI] Failed to load trace file: {e}")
        return
        
    print(f"\n🧠 INSPECTING SESSION: {data.get('session_id')}")
    print(f"Agent Name: {data.get('agent_name')}")
    print(f"Timestamp:  {data.get('timestamp')}")
    print(f"Node Count: {len(data.get('events', []))}")
    print("=" * 80)
    
    # Simple ASCII tree layout
    events = data.get("events", [])
    events_by_id = {e["id"]: e for e in events}
    
    # Build tree representation
    children = {}
    roots = []
    for e in events:
        p_id = e.get("parentId")
        if not p_id or p_id not in events_by_id:
            roots.append(e)
        else:
            if p_id not in children:
                children[p_id] = []
            children[p_id].append(e)
            
    def print_node(node, indent="", is_last=True):
        marker = "└─ " if is_last else "├─ "
        node_type = node.get("type", "thought").upper()
        
        # Color markers using simple ANSI terminals
        color = "\033[94m" # Blue
        if node_type == "TOOL_CALL":
            color = "\033[93m" # Yellow
        elif node_type == "TOOL_RESULT":
            color = "\033[92m" # Green
        elif node_type == "MEMORY":
            color = "\033[95m" # Purple
        elif node_type == "HALLUCINATION":
            color = "\033[91m" # Red
            
        content = node.get("content", "")
        # Truncate content line
        if len(content) > 75:
            content = content[:72] + "..."
            
        print(f"{indent}{marker}{color}[{node_type}]\033[0m {content}")
        
        node_children = children.get(node["id"], [])
        child_indent = indent + ("   " if is_last else "│  ")
        for i, child in enumerate(node_children):
            print_node(child, child_indent, i == len(node_children) - 1)
            
    for i, root in enumerate(roots):
        print_node(root, "", i == len(roots) - 1)
    print("=" * 80 + "\n")

def cmd_replay(args):
    static_dir = find_static_dir()
    if not static_dir:
        print("[Aether CLI] WARNING: Pre-compiled visualizer UI assets could not be found.")
        print("[Aether CLI] Running in API-only proxy mode. Open your main website dashboard to connect.")
    
    port = args.port
    handler = AetherReplayHandler
    
    # Try to acquire port safely
    server = None
    for attempt in range(5):
        try:
            socketserver.TCPServer.allow_reuse_address = True
            server = socketserver.TCPServer(("", port), handler)
            break
        except OSError:
            print(f"[Aether CLI] Port {port} is occupied, trying {port+1}...")
            port += 1
            
    if not server:
        print("[Aether CLI] Error: Could not acquire a local port for serving.")
        sys.exit(1)
        
    url = f"http://localhost:{port}"
    print(f"\n🌌 Aether Observatory Replay Server")
    print(f"==================================================")
    print(f"Address:      {url}")
    print(f"UI Directory: {static_dir or 'Not found (Proxy-only)'}")
    print(f"Trace Source: .aether/traces/*.json")
    print(f"==================================================")
    print(f"Press CTRL+C to stop the replay server safely.\n")
    
    # Launch browser automatically
    def open_browser():
        webbrowser.open(url)
        
    threading.Timer(0.8, open_browser).start()
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[Aether CLI] Shutting down replay server safely...")
        server.server_close()
        sys.exit(0)

def main():
    parser = argparse.ArgumentParser(description="Aether AI Observability Platform CLI")
    subparsers = parser.add_subparsers(dest="command", help="CLI commands")
    
    # list command
    subparsers.add_parser("list", help="List all local trace sessions")
    
    # inspect command
    inspect_parser = subparsers.add_parser("inspect", help="ASCII tree preview of a trace session")
    inspect_parser.add_argument("session_id", nargs="?", help="Specific session ID or subset to inspect")
    
    # replay command
    replay_parser = subparsers.add_parser("replay", help="Launch interactive local visualizer server")
    replay_parser.add_argument("--port", type=int, default=3000, help="Local port to serve visualizer on")
    
    args = parser.parse_args()
    
    # Fallback to replay if no command given
    if not args.command:
        args.command = "replay"
        args.port = 3000
        
    if args.command == "list":
        cmd_list(args)
    elif args.command == "inspect":
        cmd_inspect(args)
    elif args.command == "replay":
        cmd_replay(args)

if __name__ == "__main__":
    main()
