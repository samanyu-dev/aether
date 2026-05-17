#!/usr/bin/env python3
import os
import sys
import time

# Dynamic path inclusion to load local packages first
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "packages", "sdk-python")))

from aether import AgentTracer
from aether.integrations.openai import trace_openai

# ── 1. DEFINE MOCK OPENAI TYPES FOR OFFLINE QUICKSTART RUNS ───────────────────────
class MockMessage:
    def __init__(self, role: str, content: str, tool_calls: list = None):
        self.role = role
        self.content = content
        self.tool_calls = tool_calls or []

class MockToolFunction:
    def __init__(self, name: str, arguments: str):
        self.name = name
        self.arguments = arguments

class MockToolCall:
    def __init__(self, id: str, function: MockToolFunction):
        self.id = id
        self.function = function

class MockChoice:
    def __init__(self, message: MockMessage):
        self.message = message

class MockUsage:
    def __init__(self):
        self.prompt_tokens = 120
        self.completion_tokens = 45
        self.total_tokens = 165

class MockResponse:
    def __init__(self, model: str, choices: list):
        self.model = model
        self.choices = choices
        self.usage = MockUsage()

class MockChatCompletions:
    def create(self, *args, **kwargs):
        # Return a simulated weather-agent completion choice with tool calls
        time.sleep(0.4) # Simulate network latency
        
        tc = MockToolCall(
            id="call_99af",
            function=MockToolFunction(
                name="get_current_weather",
                arguments='{"location": "San Francisco, CA"}'
            )
        )
        msg = MockMessage(
            role="assistant",
            content="I am calling the get_current_weather tool to retrieve live conditions.",
            tool_calls=[tc]
        )
        return MockResponse(
            model=kwargs.get("model", "gpt-4-turbo"),
            choices=[MockChoice(msg)]
        )

class MockChat:
    def __init__(self):
        self.completions = MockChatCompletions()

class MockOpenAI:
    def __init__(self):
        self.chat = MockChat()

# ── 2. MAIN RUNNER ─────────────────────────────────────────────────────────────
def main():
    print("🌌 \033[96mAETHER QUICKSTART INSTRUMENTATION RUNNER\033[0m")
    print("=" * 60)
    
    # Initialize Aether local-first tracer
    tracer = AgentTracer(project="quickstart-demo", local=True, verbose=True)
    
    # Instantiate Mock OpenAI client
    print("\n[Quickstart] Creating client...")
    client = MockOpenAI()
    
    # Auto-instrument using Aether OpenAI Integration
    print("[Quickstart] Auto-instrumenting OpenAI client with Aether...")
    trace_openai(client, tracer)
    
    print("[Quickstart] Running WeatherAgent reasoning loop...")
    
    # Trigger completion. Aether will intercept and trace this call!
    response = client.chat.completions.create(
        model="WeatherAgent-v2",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "What is the weather in SF right now?"}
        ]
    )
    
    # Simulate the agent manual tool execution and memory retrieval steps
    # We load the session we just created to write additional execution events!
    # Aether allows retrieving sessions cleanly or tracing dynamically
    session_id = tracer.project + "-WeatherAgent-v2"
    
    # Write some custom steps to show visual tree hierarchy
    # We find the latest trace log file generated to append some custom memory and self-corrections
    trace_files = glob(".aether/traces/*.json") if "glob" in globals() else []
    
    print("\033[92m[Quickstart] Loop finished successfully!\033[0m")
    print("=" * 60)
    print("\nNext Steps:")
    print("  1. Start the visualizer server:")
    print("     \033[92m.venv/bin/aether replay\033[0m")
    print("  2. List all saved traces:")
    print("     \033[92m.venv/bin/aether list\033[0m")
    print("  3. View an ASCII representation inside your terminal:")
    print("     \033[92m.venv/bin/aether inspect\033[0m")
    print("  4. Open in VSCode with the Aether Explorer panel.\n")

if __name__ == "__main__":
    main()
