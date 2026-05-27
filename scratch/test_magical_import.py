from aether.integrations.openai import instrument_openai
from aether import get_global_tracer

class MockChatCompletions:
    def create(self, *args, **kwargs):
        class MockChoiceMessage:
            content = "Success"
            tool_calls = None
        class MockChoice:
            message = MockChoiceMessage()
        class MockResponse:
            choices = [MockChoice()]
        return MockResponse()

class MockChat:
    completions = MockChatCompletions()

class MockClient:
    chat = MockChat()

def test_magical_instrument():
    client = MockClient()
    # Call parameterless instrument_openai!
    instrumented = instrument_openai(client)
    
    # Assert that global tracer is successfully mapped behind the scenes
    global_tracer = get_global_tracer()
    assert global_tracer is not None
    assert global_tracer.project == "default-local"
    assert global_tracer.local is True
    
    print("✔ Magical Parameterless Import Test Passed!")

if __name__ == "__main__":
    test_magical_instrument()
