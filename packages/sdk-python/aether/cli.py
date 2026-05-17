#!/usr/bin/env python3
import os
import json
import sys
import argparse
import http.server
import socketserver
import webbrowser
import threading
import shutil
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
        # Mute standard logging
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
            traces.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
            self.wfile.write(json.dumps(traces).encode("utf-8"))
            return
            
        # API 2: Fetch latest trace file content
        elif self.path == "/api/traces/latest":
            trace_files = glob(".aether/traces/*.json")
            if not trace_files:
                self.send_error(404, "No traces found")
                return
            # Find the latest by file modification time
            trace_files.sort(key=os.path.getmtime, reverse=True)
            filepath = trace_files[0]
            
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            with open(filepath, "rb") as f:
                self.wfile.write(f.read())
            return
            
        # API 3: Load a specific trace content
        elif self.path.startswith("/api/traces/"):
            filename = self.path[len("/api/traces/"):]
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
            
        super().do_GET()

    def translate_path(self, path):
        static_dir = find_static_dir()
        if not static_dir:
            return super().translate_path(path)
        
        path = path.split("?")[0].split("#")[0]
        rel_path = path.lstrip("/")
        
        if not rel_path:
            rel_path = "index.html"
            
        target = os.path.join(static_dir, rel_path)
        
        if not os.path.exists(target) and "." not in rel_path:
            target = os.path.join(static_dir, "index.html")
            
        return target

def cmd_list(args):
    trace_files = glob(".aether/traces/*.json")
    if not trace_files:
        print("\033[93m[Aether CLI] No local traces found. Instrument your agent with `AgentTracer` to write traces.\033[0m")
        return
    
    print("\n🌌 \033[96mAETHER LOCAL TRACES\033[0m")
    print("=" * 85)
    print(f"{'TIMESTAMP':<25} | {'AGENT':<20} | {'SESSION ID':<25} | {'NODES':<6}")
    print("-" * 85)
    
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
            
    traces.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    
    for t in traces:
        try:
            dt = datetime.fromisoformat(t["timestamp"].replace("Z", "+00:00"))
            time_str = dt.strftime("%Y-%m-%d %H:%M:%S")
        except Exception:
            time_str = t["timestamp"][:19]
            
        print(f"{time_str:<25} | {t['agent_name'][:20]:<20} | {t['session_id'][:25]:<25} | {t['event_count']:<6}")
    print("=" * 85)
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
        print(f"\033[91m[Aether CLI] Target trace file not found.\033[0m")
        return
        
    try:
        with open(target_file, "r") as f:
            data = json.load(f)
    except Exception as e:
        print(f"\033[91m[Aether CLI] Failed to load trace file: {e}\033[0m")
        return
        
    print(f"\n🧠 \033[95mINSPECTING SESSION: {data.get('session_id')}\033[0m")
    print(f"Agent Name: {data.get('agent_name')}")
    print(f"Timestamp:  {data.get('timestamp')}")
    print(f"Node Count: {len(data.get('events', []))}")
    print("=" * 80)
    
    events = data.get("events", [])
    events_by_id = {e["id"]: e for e in events}
    
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
        print("\033[93m[Aether CLI] WARNING: Pre-compiled visualizer UI assets could not be found.\033[0m")
        print("[Aether CLI] Running in API-only proxy mode. Open your main website dashboard to connect.")
    
    port = args.port
    handler = AetherReplayHandler
    
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
        print("\033[91m[Aether CLI] Error: Could not acquire a local port for serving.\033[0m")
        sys.exit(1)
        
    url = f"http://localhost:{port}"
    print(f"\n🌌 \033[96mAether Observatory Replay Server\033[0m")
    print(f"==================================================")
    print(f"Address:      \033[92m{url}\033[0m")
    print(f"UI Directory: {static_dir or 'Not found (Proxy-only)'}")
    print(f"Trace Source: .aether/traces/*.json")
    print(f"==================================================")
    print(f"Press CTRL+C to stop the replay server safely.\n")
    
    def open_browser():
        webbrowser.open(url)
        
    threading.Timer(0.8, open_browser).start()
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n\033[93m[Aether CLI] Shutting down replay server safely...\033[0m")
        server.server_close()
        sys.exit(0)

def cmd_doctor(args):
    print("\n🩺 \033[95mAETHER HEALTH DIAGNOSTIC REPORT\033[0m")
    print("=" * 60)
    
    # 1. System Version
    print(f"Python Version:   \033[92m{sys.version.split()[0]}\033[0m")
    print(f"Aether Version:   \033[92m0.2.0a1\033[0m")
    
    # 2. Workspace Check
    print("\nChecking Workspace Directories:")
    folders = [".aether", ".aether/traces", ".aether/sessions", ".aether/cache"]
    for folder in folders:
        if os.path.exists(folder):
            writable = os.access(folder, os.W_OK)
            status = "\033[92m[FOUND & WRITABLE]\033[0m" if writable else "\033[91m[NOT WRITABLE]\033[0m"
            print(f"  - {folder:<18}: {status}")
        else:
            print(f"  - {folder:<18}: \033[93m[MISSING - Will auto-create on SDK trace start]\033[0m")
            
    # 3. Static Assets Check
    static_dir = find_static_dir()
    print("\nChecking Visualization Assets:")
    if static_dir:
        print(f"  - Output UI Folder: \033[92m{static_dir}\033[0m")
        print(f"  - Status:           \033[92m[OK - Ready for offline replays]\033[0m")
    else:
        print(f"  - Status:           \033[91m[MISSING - CLI will run in Proxy-only mode]\033[0m")
        
    # 4. Local Trace Count
    trace_files = glob(".aether/traces/*.json")
    print(f"\nTrace Library Count: \033[96m{len(trace_files)} sessions detected.\033[0m")
    print("=" * 60)
    print("Diagnosis complete. \033[92mSystem healthy and ready.\033[0m\n")

def cmd_clean(args):
    trace_files = glob(".aether/traces/*.json")
    cache_files = glob(".aether/cache/*")
    
    total_files = len(trace_files) + len(cache_files)
    if total_files == 0:
        print("[Aether CLI] Workspace is already clean.")
        return
        
    if not args.force:
        confirm = input(f"Warning: This will delete all {len(trace_files)} trace logs and {len(cache_files)} cache files. Proceed? (y/N): ")
        if confirm.lower() not in ["y", "yes"]:
            print("Cleanup cancelled.")
            return
            
    for f in trace_files + cache_files:
        try:
            if os.path.isdir(f):
                shutil.rmtree(f)
            else:
                os.remove(f)
        except Exception:
            pass
            
    print(f"\033[92m[Aether CLI] Successfully removed {total_files} local observability logs.\033[0m")

def cmd_export(args):
    trace_files = glob(".aether/traces/*.json")
    target_file = None
    
    if args.session_id:
        for tf in trace_files:
            if args.session_id in tf:
                target_file = tf
                break
    else:
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
        print("\033[91m[Aether CLI] Trace file not found to export.\033[0m")
        return
        
    os.makedirs(".aether/exports", exist_ok=True)
    destination = os.path.join(".aether", "exports", os.path.basename(target_file))
    shutil.copy(target_file, destination)
    
    print(f"📦 \033[92mSession exported successfully!\033[0m")
    print(f"Path: \033[96m{destination}\033[0m")

def cmd_summarize(args):
    trace_files = glob(".aether/traces/*.json")
    target_file = None
    
    if args.session_id:
        for tf in trace_files:
            if args.session_id in tf:
                target_file = tf
                break
    else:
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
        print("\033[91m[Aether CLI] Session trace not found to summarize.\033[0m")
        return
        
    try:
        with open(target_file, "r") as f:
            data = json.load(f)
    except Exception as e:
        print(f"\033[91mFailed to read trace file: {e}\033[0m")
        return
        
    events = data.get("events", [])
    
    # Calculate stats
    thought_count = sum(1 for e in events if e.get("type") == "thought")
    tool_calls = sum(1 for e in events if e.get("type") == "tool_call")
    memory_count = sum(1 for e in events if e.get("type") == "memory")
    hallucination_count = sum(1 for e in events if e.get("type") == "hallucination")
    
    latencies = []
    for e in events:
        if e.get("type") == "tool_result" and "latency" in e.get("metadata", {}):
            latencies.append(e["metadata"]["latency"])
            
    avg_latency = sum(latencies) / len(latencies) if latencies else 0.0
    
    # Estimate total generated output tokens
    tokens = [e.get("content", "") for e in events if e.get("type") == "token"]
    total_tokens = sum(len(t.split()) for t in tokens) if tokens else 0
    if not total_tokens and tokens:
        total_tokens = len(tokens)
        
    print(f"\n📊 \033[96mAETHER COGNITION SUMMARY: {data.get('session_id')}\033[0m")
    print("=" * 60)
    print(f"Agent Persona:           \033[92m{data.get('agent_name')}\033[0m")
    print(f"Timestamp:               {data.get('timestamp')}")
    print(f"Total Traversal Nodes:   {len(events) - len(tokens)}")
    print("-" * 60)
    print(f"💡 Thoughts Generated:   {thought_count}")
    print(f"⚙️ Tool Executions:      {tool_calls}")
    print(f"💾 Memory Recalls:       {memory_count}")
    print(f"⚠️ Hallucinations:       \033[91m{hallucination_count}\033[0m")
    print("-" * 60)
    print(f"⏱️ Avg Tool Latency:      {avg_latency:.1f}ms")
    print(f"🔤 Output Token Count:   {total_tokens} tokens")
    print("=" * 60 + "\n")

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
    
    # open latest command
    subparsers.add_parser("open", help="Shortcut to open latest trace in browser")
    
    # doctor command
    subparsers.add_parser("doctor", help="Check workspace permissions and static assets diagnostic")
    
    # clean command
    clean_parser = subparsers.add_parser("clean", help="Safely erase local trace and cache files")
    clean_parser.add_argument("--force", "-f", action="store_true", help="Force deletion without prompt")
    
    # export command
    export_parser = subparsers.add_parser("export", help="Export trace session to designated exports folder")
    export_parser.add_argument("session_id", nargs="?", help="Specific session ID to export")
    
    # summarize command
    summarize_parser = subparsers.add_parser("summarize", help="Compute execution metrics, latency, and tokens")
    summarize_parser.add_argument("session_id", nargs="?", help="Specific session ID to summarize")
    
    args = parser.parse_args()
    
    # Fallback to replay
    if not args.command:
        args.command = "replay"
        args.port = 3000
        
    if args.command == "list":
        cmd_list(args)
    elif args.command == "inspect":
        cmd_inspect(args)
    elif args.command == "replay":
        cmd_replay(args)
    elif args.command == "doctor":
        cmd_doctor(args)
    elif args.command == "clean":
        cmd_clean(args)
    elif args.command == "export":
        cmd_export(args)
    elif args.command == "summarize":
        cmd_summarize(args)
    elif args.command == "open":
        # Launch replay command to act as open
        args.port = 3000
        cmd_replay(args)

if __name__ == "__main__":
    main()
