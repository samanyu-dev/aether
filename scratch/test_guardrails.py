import builtins
import sys
import os

# Make sure we import aether correctly from our local package
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "packages", "sdk-python")))

import aether
from aether import get_global_tracer

# Mock built-in input to automatically return 'a' (abort) to prevent hangs in automated tests
builtins.input = lambda prompt="": "a"

tracer = get_global_tracer()

# Register a breakpoint hook with a condition lambda targeting high-risk commands
@tracer.breakpoint(when="tool_call", condition=lambda ctx: ctx.args.get("cmd") == "danger")
def audit_tool(ctx):
    print(f"🔒 [Hook Triggered] {ctx.tool_name} args={ctx.args}")
    # Return False to initiate halt/interactive prompt loop
    return False

print("Starting guardrails verification...")
with tracer.guardrails():
    with tracer.session("sandbox-verification") as session:
        # 1. Safe command should execute cleanly without triggering the hook
        session.tool_call("bash_exec", {"cmd": "safe"})
        print("✔ Safe command bypassed hook correctly")
        
        # 2. Danger command should match the lambda condition and be blocked/aborted
        try:
            session.tool_call("bash_exec", {"cmd": "danger"})
            raise AssertionError("FAIL: Danger command was not intercepted by the guardrails!")
        except RuntimeError as e:
            print(f"✔ Danger command intercepted successfully: {e}")

print("✨ Sandbox guardrails verification PASSED!")
