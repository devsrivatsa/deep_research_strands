from strands import Agent
from pydantic import BaseModel, Field
from typing import List, Literal

# reasoning agent assumed
task_analyzer_prompt = """
You are an expert at conducting research with subordinate researcher agents, given a research plan.
The plan you receive will contain a list of research jobs, each with a specific goal or intention. Some of these research jobs would be dependent on each other, and others would be independent. 
Your primary objective is to convert each job into a set of research tasks, and assign tasks to the appropriate type of research worker by following the guidelines below.

<job_breakdown_guidelines>
- Simple_Tasks: jobs that can be answered by a single tool call. Example: "lookup the capital of France", in which case you could create a single task.
- Dependent_Tasks: jobs that are complex enough to be broken down into few tasks, but they are dependent on each other in a manner that the output of one task is used as input to the next task. Hence they should be in the right order. Example: "research tax reforms in canada to understand its impact on the company's tax liability", in which case you could create the following tasks:
  - use google_search_tool to search for tax reforms in canada
  - use analyzer_tool to understand the impact of tax reforms on the company's tax liability
  - use calculator_tool to calculate the potential tax savings or losses for the company
- Independent_Tasks: jobs that are complex enough to be broken down into a few tasks that are independent of each other. Example: "research the impact of climate change on global economies", in which case you could create the following tasks:
  - use google_search_tool to search for the impact of climate change on the US economy
  - use google_search_tool to search for the impact of climate change on the European economy
  - use google_search_tool to search for the impact of climate change on the Asian economy
- Complex_Tasks: Jobs that could be broken down into any combination of Simple_Tasks, Dependent_Tasks, and Independent_Tasks. Example: "Research the effectiveness and market potential of a new cancer drug", in which case you could create the following tasks:
  Simple_Tasks:
  - use google_search_tool to find the correct or approximate number of cancer patients in the world
  - use calculator_tool to calculate the market size based on cancer patient population
  Dependent_Tasks:
  - use pub_med_search to find clinical trial results for the drug
  - use perplexity_search to analyze the trial results and determine effectiveness
  Independent_Tasks:
  - use google_search to research competing cancer drugs in development
  - use google_search to find current cancer drug market leaders
  - use reddit_research_tool to gather patient/doctor sentiment about existing treatments
</job_breakdown_guidelines>

<budget_analyzer_guidelines>
Query complexity vs tool call: Select optimal tools and set a 'research budget' which is a tool call count adapted to query complexity for maximum efficiency.
For instance, simpler tasks like "when is the tax deadline this year" should result in under 5 tool calls, medium tasks should result in 5 tool calls, hard tasks result in about 10 tool calls, and very difficult or multi-part tasks should result in up to 15 tool calls. Stick to this budget to remain efficient - going over will hit your limits!
</budget_analyzer_guidelines>
"""

class SimpleTask(BaseModel):
    task_type: Literal["Simple_Task"] = "Simple_Task"
    task_desc: str = Field(description="The description of the research task")

class DependentTask(BaseModel):
    task_type: Literal["Dependent_Task"] = "Dependent_Task"
    tasks: List[str] = Field(description="The list of dependent research tasks to be executed")

class ComplexTask(BaseModel):
    task_type: Literal["Complex_Task"] = "Complex_Task"
    independent_tasks: List[str] = Field(description="The list of independent research tasks to be executed")
    dependent_tasks: List[DependentTask] = Field(description="The list of dependent research tasks to be executed")

class ProcessedJob(BaseModel):
    job_desc: str = Field(description="The description of the research job")
    task_list: List[SimpleTask | DependentTask | ComplexTask] = Field(description="The list of research tasks to be executed")
    tool_call_budget: int = Field(description="The number of tool calls to be used to complete the research task")

class ResearchActionPlan(BaseModel):
    research_tasks: List[ProcessedJob] = Field(description="The list of research tasks to be executed")


task_analyzer_agent = Agent(
    name="task_analyzer_agent",
    description="An agent that analyzes the research job and converts it into a list of research tasks",
    model="gemini-2.5-flash"
)

def task_analysis(research_plan: ResearchPlan):
    task_analysis = task_analyzer_agent.structured_output(ResearchActionPlan, task_analyzer_prompt)
    return task_analysis