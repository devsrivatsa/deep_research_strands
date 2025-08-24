from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Literal, Annotated
from .tools import ToolCall


class CompressedResearchOutput(BaseModel):
    findings: str = Field(description="The fully comprehensive findings of the research task")
    tool_calls: List[ToolCall] = Field(description="A list of tool calls made during the research process")
    sources_with_citations: List[Dict[str, str]] = Field(description="A list of dictionaries with key as sources and values as their corresponding citations")


class CompletedResearchTask(BaseModel):
    research_task: str
    completed_research_tasks: List[str]
    compress_research_output: CompressedResearchOutput


class ResearchJob(BaseModel):
    """
    A research job is a single task that needs to be completed in order to answer the overall research question.
    """
    research_tasks: List[str] = Field(description="A list of research tasks that need to be completed in order to answer the overall research question.")


class FinalResearchReview(BaseModel):
    research_verdict: Literal["research_complete", "research_incomplete"] = Field(description="The verdict on the research findings. You should return 'research_complete'/'research_incomplete' based on whether the research findings are comprehensive and complete enough to answer the overall research question.")
    research_tasks_completed: List[str] = Field(description="A list of research tasks that have been completed and is useful.")
    research_tasks_missing: List[Dict[str, str]] = Field(description="A list of research tasks that are needed for further improvement or that are missing and needs to be completed, with their purposes. The key is the research task, and the value is the purpose of the research task.")


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


class ResearchOutput(BaseModel):
    research_output: str = Field(description="The output of the research task")


class PlanElement(BaseModel):
    description: str = Annotated[str, "A clear description of the plan step"]
    should_decompose: bool = Annotated[bool, "Whether this step should be decomposed into smaller steps"]
    sub_steps: Optional[List[str]] = Annotated[Optional[List[str]], "A list of sub-steps that need to be taken to complete this step"]
    expected_output: Optional[str] = Annotated[Optional[str], "A clear description of the expected output from this step"]
    is_strictly_necessary: bool = Annotated[bool, "Whether this step is strictly necessary to answer the user's query well"]    


class StraightforwardResearchPlan(BaseModel):
    direct_path: str = Annotated[str, "A direct path to the answer"]
    fact_finding_steps: Optional[List[str]] = Annotated[Optional[List[str]], "A list of fact-finding steps that need to be taken to answer the query"]
    key_data_points: Optional[List[str]] = Annotated[Optional[List[str]], "A list of key data points that need to be found to answer the query"]
    sources_to_use: Optional[List[str]] = Annotated[Optional[List[str]], "A list of sources that need to be used to answer the query"]
    verification_steps: Optional[List[str]] = Annotated[Optional[List[str]], "A list of verification steps that need to be taken to ensure the accuracy of the answer"]
    plan_elements: Optional[List[PlanElement]] = Annotated[Optional[List[PlanElement]], "A list of plan elements that need to be addressed to answer the query"]


class DepthFirstResearchPlan(BaseModel):
    approaches: List[str] = Annotated[List[str], "A list of 3-5 different methodological approaches or perspectives"]
    expert_viewpoints: List[str] = Annotated[List[str], "A list of specific expert viewpoints or sources of evidence that would enrich the analysis"]
    synthesis_method: str = Annotated[str, "A clear plan for how findings from different approaches will be synthesized"]


class BreadthFirstResearchPlan(BaseModel):
    sub_questions: List[str] = Annotated[List[str], "A list of all the distinct sub-questions or sub-tasks that can be researched independently to answer the query"]
    critical_sub_questions: List[str] = Annotated[List[str], "A list of the most critical sub-questions or perspectives needed to answer the query comprehensively"]
    sub_agent_boundaries: Dict[str, str] = Annotated[Dict[str, str], "A dictionary of extremely clear, crisp, and understandable boundaries between sub-topics to prevent overlap"]
    aggregation_method: str = Annotated[str, "A clear plan for how findings will be aggregated into a coherent whole"]


class Feedback(BaseModel):
    research_task: str
    incomplete_research_tasks: List[str]


class HumanFeedbackDecision(BaseModel):
    class ModificationFeedback(BaseModel):
        retain: Optional[str] = Field(description="What needs to be retained from the existing plan, clearly and concisely stated. [Only relevant if the modification_option is 'same_approach']")
        change: Optional[str] = Field(description="what needs to change the existing plan. [Only relevant if the modification_option is 'same_approach']")
        addition: Optional[str] = Field(description="what needs to be included in the new or existing research plan")
        deletion: Optional[str] = Field(description="what needs to be removed from the existing plan")
    
    action: Literal["proceed", "modify_existing", "develop_new"]
    modification_option: Optional[Literal["same_approach", "different_approach"]] = Field(description="use same query type and research approach or use different query type and approach. [Only relevant if the action is 'modify_existing']")
    modification_feedback: Optional[ModificationFeedback] = Field(description="feedback on what needs to be included or changed in the modified plan.[Only relevant if the action is NOT 'proceed']")
    new_query: Optional[str] = Field(description="The new ideas that the user has introduced in the feedback condensed into a well defined research query.[Only relevant if action is 'develop_new']")