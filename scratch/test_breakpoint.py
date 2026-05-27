import sys
from aether import AgentTracer, get_global_tracer

def test_breakpoints():
    tracer = get_global_tracer()
    
    # 1. Define custom programmatic breakpoint hook
    @tracer.breakpoint(before="tool_call")
    def guard_shell(ctx):
        if ctx.tool_name == "dangerous_exec":
            print(f"\n[Sandbox Hook] Dangerous tool detected: {ctx.tool_name}. Interrupting!")
            return False  # Return False to trigger Aether interactive prompt hold loop!
        return True

    # 2. Simulate session execution with tool call triggers
    print("Starting session simulation...")
    with tracer.session(name="sandbox-agent") as session:
        session.thought("Formulating execution options")
        
        # This call will NOT trigger the breakpoint because tool name is safe
        print("Invoking safe tool_call (should pass instantly)...")
        session.tool_call(tool_name="get_weather", args={"loc": "San Francisco"})
        
        # This call WILL trigger the breakpoint because tool name is dangerous
        print("\nInvoking dangerous tool_call (should trigger interrupt holds)...")
        print("NOTE: Select '[c] Continue' or '[e] Edit' to complete the sandbox simulation run.")
        session.tool_call(tool_name="dangerous_exec", args={"cmd": "rm -rf /"})
        
        print("\n✔ Breakpoint simulation finished successfully!")

if __name__ == "__main__":
    test_breakpoints()
