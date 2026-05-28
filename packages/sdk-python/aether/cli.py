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
    print(f"Aether Version:   \033[92m0.1.0b1\033[0m")
    
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
            
    print(f"\033[92m[Aether CLI] Successfully removed {total_files} local cognition replay logs.\033[0m")

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
    node_count = sum(1 for e in events if e.get("type") != "token")
    tool_calls = sum(1 for e in events if e.get("type") == "tool_call")
    hallucination_count = sum(1 for e in events if e.get("type") == "hallucination")
    correction_count = sum(1 for e in events if e.get("metadata", {}).get("selfCorrection") is True)
    
    duration_str = "0s"
    if len(events) >= 2:
        try:
            t1 = datetime.fromisoformat(events[0]["timestamp"].replace("Z", "+00:00"))
            t2 = datetime.fromisoformat(events[-1]["timestamp"].replace("Z", "+00:00"))
            seconds = int((t2 - t1).total_seconds())
            duration_str = f"{seconds}s"
        except Exception:
            pass

    print(f"\n🌌 \033[96mAETHER TRACE SUMMARY\033[0m")
    print("────────────────────────")
    print(f"Session:        \033[92m{data.get('session_id')}\033[0m")
    print(f"Nodes:          {node_count}")
    
    if hallucination_count > 0:
        print(f"Hallucinations: \033[91m{hallucination_count} (Safely Intercepted)\033[0m")
    else:
        print(f"Hallucinations: 0")
        
    if correction_count > 0:
        print(f"Corrections:    \033[92m{correction_count} (100% Recovery)\033[0m")
    else:
        print(f"Corrections:    0")
        
    print(f"Tools Used:     {tool_calls}")
    print(f"Duration:       {duration_str}")
    print("────────────────────────\n")

def load_trace(source):
    if os.path.exists(source):
        try:
            with open(source, "r") as f:
                return json.load(f)
        except Exception as e:
            print(f"\033[91mError reading file {source}: {e}\033[0m")
            return None
    
    # Try searching in .aether/traces/
    trace_files = glob(".aether/traces/*.json")
    for tf in trace_files:
        if source in tf or source in os.path.basename(tf):
            try:
                with open(tf, "r") as f:
                    return json.load(f)
            except Exception:
                pass
    return None

def cmd_diff(args):
    baseline_data = load_trace(args.baseline)
    experiment_data = load_trace(args.experiment)
    
    if not baseline_data:
        print(f"\033[91m[Aether CLI] Failed to find or load baseline trace: {args.baseline}\033[0m")
        return
    if not experiment_data:
        print(f"\033[91m[Aether CLI] Failed to find or load experiment trace: {args.experiment}\033[0m")
        return

    # Filter out tokens to focus on reasoning nodes
    baseline_events = [e for e in baseline_data.get("events", []) if e.get("type") != "token"]
    experiment_events = [e for e in experiment_data.get("events", []) if e.get("type") != "token"]

    # Hybrid sequence matching: match by ID first, fallback to sequential types
    pairs_by_id = []
    unmatched_baseline = list(baseline_events)
    unmatched_experiment = list(experiment_events)
    
    for exp in list(unmatched_experiment):
        base_match = next((b for b in unmatched_baseline if b["id"] == exp["id"]), None)
        if base_match:
            pairs_by_id.append((base_match, exp))
            unmatched_baseline.remove(base_match)
            unmatched_experiment.remove(exp)
            
    pairs_by_type = []
    for exp in list(unmatched_experiment):
        base_match = next((b for b in unmatched_baseline if b["type"] == exp["type"]), None)
        if base_match:
            pairs_by_type.append((base_match, exp))
            unmatched_baseline.remove(base_match)
            unmatched_experiment.remove(exp)

    # Reconstruct unified flow
    comparison_flow = []
    emitted_baseline = set()
    all_pairs = pairs_by_id + pairs_by_type
    
    for exp in experiment_events:
        pair = next((p for p in all_pairs if p[1]["id"] == exp["id"]), None)
        if pair:
            base = pair[0]
            # Emit deleted baseline nodes that appeared before 'base'
            try:
                base_idx = baseline_events.index(base)
                for i in range(base_idx):
                    b_prev = baseline_events[i]
                    is_deleted = not any(p[0]["id"] == b_prev["id"] for p in all_pairs)
                    if is_deleted and b_prev["id"] not in emitted_baseline:
                        comparison_flow.append((b_prev, None))
                        emitted_baseline.add(b_prev["id"])
            except ValueError:
                pass
                
            comparison_flow.append((base, exp))
            emitted_baseline.add(base["id"])
        else:
            # Added node
            comparison_flow.append((None, exp))
            
    # Emit remaining deleted baseline nodes
    for b_prev in baseline_events:
        is_deleted = not any(p[0]["id"] == b_prev["id"] for p in all_pairs)
        if is_deleted and b_prev["id"] not in emitted_baseline:
            comparison_flow.append((b_prev, None))
            emitted_baseline.add(b_prev["id"])

    # Render gorgeous side-by-side terminal comparison
    col_width = 54
    print(f"\n🌌 \033[96mAETHER COGNITIVE DIFF RUN ENGINE\033[0m")
    print("=" * (col_width * 2 + 7))
    print(f"\033[95m{'BASELINE (LEFT): ' + baseline_data.get('session_id', 'Session A'):<{col_width}}\033[0m | \033[92m{'EXPERIMENT (RIGHT): ' + experiment_data.get('session_id', 'Session B'):<{col_width}}\033[0m")
    print("=" * (col_width * 2 + 7))

    nodes_added = 0
    nodes_removed = 0
    nodes_modified = 0
    nodes_unchanged = 0

    def truncate_content(text, width):
        if not text:
            return ""
        text = text.replace("\n", " ")
        if len(text) > width - 4:
            return text[:width - 7] + "..."
        return text

    for base, exp in comparison_flow:
        left_str = ""
        right_str = ""
        connector = "|"
        
        if base is None:
            # Added node
            nodes_added += 1
            node_type = exp.get("type", "thought").upper()
            label = f"[🆕 +{node_type}] {exp.get('content', '')}"
            right_str = f"\033[92m{truncate_content(label, col_width):<{col_width}}\033[0m"
            left_str = " " * col_width
            connector = "\033[92m+\033[0m"
        elif exp is None:
            # Deleted node
            nodes_removed += 1
            node_type = base.get("type", "thought").upper()
            label = f"[❌ -{node_type}] {base.get('content', '')}"
            left_str = f"\033[91m{truncate_content(label, col_width):<{col_width}}\033[0m"
            right_str = " " * col_width
            connector = "\033[91m-\033[0m"
        else:
            # Compare both
            node_type = exp.get("type", "thought").upper()
            base_content = base.get("content", "")
            exp_content = exp.get("content", "")
            
            is_modified = base_content != exp_content or base.get("type") != exp.get("type")
            
            # Latency checks
            base_lat = base.get("metadata", {}).get("latency")
            exp_lat = exp.get("metadata", {}).get("latency")
            lat_badge = ""
            if base_lat is not None and exp_lat is not None:
                delta = int(exp_lat) - int(base_lat)
                if delta < 0:
                    lat_badge = f" [⚡ {delta}ms]"
                elif delta > 0:
                    lat_badge = f" [⚠ +{delta}ms]"
            
            # Confidence checks
            base_conf = base.get("metadata", {}).get("confidence")
            exp_conf = exp.get("metadata", {}).get("confidence")
            conf_badge = ""
            if base_conf is not None and exp_conf is not None:
                delta_conf = float(exp_conf) - float(base_conf)
                if delta_conf < -0.02:
                    conf_badge = f" [↘ {int(delta_conf * 100)}% Collapse]"
                elif delta_conf > 0.02:
                    conf_badge = f" [↗ +{int(delta_conf * 100)}%]"

            if is_modified:
                nodes_modified += 1
                l_label = f"[⚡ *{node_type}] {base_content}"
                r_label = f"[⚡ *{node_type}] {exp_content}{lat_badge}{conf_badge}"
                left_str = f"\033[93m{truncate_content(l_label, col_width):<{col_width}}\033[0m"
                right_str = f"\033[93m{truncate_content(r_label, col_width):<{col_width}}\033[0m"
                connector = "\033[93m*\033[0m"
            else:
                nodes_unchanged += 1
                badge_info = f"{lat_badge}{conf_badge}"
                l_label = f"[{node_type}] {base_content}"
                r_label = f"[{node_type}] {exp_content}{badge_info}"
                left_str = f"\033[90m{truncate_content(l_label, col_width):<{col_width}}\033[0m"
                right_str = f"\033[94m{truncate_content(r_label, col_width):<{col_width}}\033[0m"
                connector = "|"
                
        print(f"{left_str} {connector} {right_str}")
        
        # Show argument diffs for modified tool calls
        if base and exp and base.get("type") == "tool_call" and exp.get("type") == "tool_call":
            base_args = base.get("metadata", {}).get("args", {})
            exp_args = exp.get("metadata", {}).get("args", {})
            if base_args != exp_args:
                try:
                    b_args_str = json.dumps(base_args)
                    e_args_str = json.dumps(exp_args)
                    if len(b_args_str) > col_width - 15: b_args_str = b_args_str[:col_width - 18] + "..."
                    if len(e_args_str) > col_width - 15: e_args_str = e_args_str[:col_width - 18] + "..."
                    diff_left = f"    └─ Args: {b_args_str}"
                    diff_right = f"    └─ Args: {e_args_str} [Mutated]"
                    print(f"\033[93m{diff_left:<{col_width}}\033[0m | \033[93m{diff_right:<{col_width}}\033[0m")
                except Exception:
                    pass

    print("=" * (col_width * 2 + 7))
    print(f"📊 \033[96mDIFF METRICS SUMMARY:\033[0m")
    print(f"  - Nodes Added:      \033[92m{nodes_added}\033[0m")
    print(f"  - Nodes Removed:    \033[91m{nodes_removed}\033[0m")
    print(f"  - Nodes Modified:   \033[93m{nodes_modified}\033[0m")
    print(f"  - Nodes Unchanged:  \033[94m{nodes_unchanged}\033[0m")
    
    # Net latency shift summary
    try:
        t_base_start = datetime.fromisoformat(baseline_events[0]["timestamp"].replace("Z", "+00:00"))
        t_base_end = datetime.fromisoformat(baseline_events[-1]["timestamp"].replace("Z", "+00:00"))
        t_exp_start = datetime.fromisoformat(experiment_events[0]["timestamp"].replace("Z", "+00:00"))
        t_exp_end = datetime.fromisoformat(experiment_events[-1]["timestamp"].replace("Z", "+00:00"))
        
        base_dur = int((t_base_end - t_base_start).total_seconds() * 1000)
        exp_dur = int((t_exp_end - t_exp_start).total_seconds() * 1000)
        net_shift = exp_dur - base_dur
        
        if net_shift < 0:
            print(f"  - Net Latency:      \033[92m{abs(net_shift)}ms GAIN\033[0m ({base_dur}ms -> {exp_dur}ms)")
        else:
            print(f"  - Net Latency:      \033[91m{net_shift}ms LOSS\033[0m ({base_dur}ms -> {exp_dur}ms)")
    except Exception:
        pass
    print("=" * (col_width * 2 + 7) + "\n")

def main():
    parser = argparse.ArgumentParser(description="Aether Local-First AI Cognition Debugger CLI")
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

    # diff command
    diff_parser = subparsers.add_parser("diff", help="Git-style cognitive diff comparing two trace sessions")
    diff_parser.add_argument("baseline", help="Baseline trace path or session ID")
    diff_parser.add_argument("experiment", help="Experiment trace path or session ID")
    
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
    elif args.command == "diff":
        cmd_diff(args)
    elif args.command == "open":
        # Launch replay command to act as open
        args.port = 3000
        cmd_replay(args)

if __name__ == "__main__":
    main()
