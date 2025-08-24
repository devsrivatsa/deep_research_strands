from strands import Agent
from strands.models.anthropic import AnthropicModel
from strands.models.ollama import OllamaModel
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from strands_tools import handoff_to_user
from typing import List, Literal
import os

load_dotenv()

anthropic_api_key=os.getenv("ANTHROPIC_API_KEY")
ollama_model = OllamaModel(model_id="qwen3:8b", host="http://localhost:11434")
anthropic_model = AnthropicModel(
    client_args={
        "api_key": anthropic_api_key,
    },
    # **model_config
    max_tokens=1028,
    model_id="claude-sonnet-4-20250514",
    params={
        "temperature": 0.1,
    }
)
class Story(BaseModel):
    story: str = Field(description="The story that you finilized after all the feedbacks")
    main_characters: List[str] = Field(description="The names of the main characters in the story")
    user_feedback: Literal["approved", "rejected"] = Field(description="The feedback from the user")

sys_prompt = """
    You are a short story writer. You will write a very short story about the topic provided by the user.
    Call the handoff_to_user tool to get user input/feedback. After receiving the feedback, use it for the next response.
    Ask if the user approves the story. If the user approves, return the story in the specified format."""

agent = Agent(model=ollama_model, tools=[handoff_to_user], system_prompt=sys_prompt)
# result = agent.structured_output(Story, )
# print(response)
# print(result.model_dump_json(indent=4))   
response = agent.tool.handoff_to_user(
    message="I need your approval to proceed. Please approve or reject the story.",
    breakout_of_loop=False
)
print(response)
result = agent("can you write a short story")
print(result)