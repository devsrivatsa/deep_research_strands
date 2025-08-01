from pydantic import BaseModel, Field
from typing import List, Dict
from research_conductor.sub_agents.research_worker.agent import ResearchOutput
from strands import Agent



compress_research_system_prompt = """You are a research assistant that has conducted research on a topic by calling several tools and web searches. Your job is now to clean up the findings, but preserve all of the relevant statements and information that the researcher has gathered. For context, today's date is {date}.

<Task>
You need to clean up information gathered from tool calls and web searches in the existing messages.
All relevant information should be repeated and rewritten verbatim, but in a cleaner format.
The purpose of this step is just to remove any obviously irrelevant or duplicative information.
For example, if three sources all say "X", you could say "These three sources all stated X".
Only these fully comprehensive cleaned findings are going to be returned to the user, so it's crucial that you don't lose any information from the raw messages.
</Task>

<Guidelines>
1. Your output findings should be fully comprehensive and include ALL of the information and sources that the researcher has gathered from tool calls and web searches. It is expected that you repeat key information verbatim.
2. This report can be as long as necessary to return ALL of the information that the researcher has gathered.
3. In your report, you should return inline citations for each source that the researcher found.
4. You should include a "Sources" section at the end of the report that lists all of the sources the researcher found with corresponding citations, cited against statements in the report.
5. Make sure to include ALL of the sources that the researcher gathered in the report, and how they were used to answer the question!
6. It's really important not to lose any sources. A later LLM will be used to merge this report with others, so having all of the sources is critical.
</Guidelines>

<Output Format>
The report should be structured like this:
**List of Queries and Tool Calls Made**
**Fully Comprehensive Findings**
**List of All Relevant Sources (with citations in the report)**
</Output Format>

<Citation Rules>
- Assign each unique URL a single citation number in your text
- Lists each source with corresponding numbers
- IMPORTANT: Number sources sequentially without gaps (1,2,3,4...) in the final list regardless of which sources you choose
- Example format:
  [1] Source Title: URL
  [2] Source Title: URL
</Citation Rules>

Critical Reminder: It is extremely important that any information that is even remotely relevant to the user's research topic is preserved verbatim (e.g. don't rewrite it, don't summarize it, don't paraphrase it)."""

class ToolCall(BaseModel):
    tool_name: str = Field(description="The name of the tool that was called")
    tool_arguments: List[Dict[str, str]] = Field(
        description="The inputs to the tool calls as a list of dictionaries with key as the input name and value as the input value for each tool call"
    )
    number_of_calls: int = Field(description="The number of times the tool was called")

class CompressedResearchOutput(BaseModel):
    findings: str = Field(description="The fully comprehensive findings of the research task")
    tool_calls: List[ToolCall] = Field(description="A list of tool calls made during the research process")
    sources_with_citations: List[Dict[str, str]] = Field(description="A list of dictionaries with key as sources and values as their corresponding citations")

def compress_research(research_output: ResearchOutput):
    compressed_research = Agent(
        name="compressed_research",
        description="A research assistant that compresses the research output into a more readable format",
        system_prompt=compress_research_system_prompt,
        model="gemini-2.5-flash"
    )

    compressed_research_output = compressed_research.structured_output(
        CompressedResearchOutput, 
        research_output.research_output
    )
    
    return compressed_research_output