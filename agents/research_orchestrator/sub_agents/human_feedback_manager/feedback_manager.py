from strands import Agent, tool
from strands_tools import handoff_to_user
from jinja2 import Environment
from typing import Optional, Dict, Any
from domain import HumanFeedbackDecision, StraightforwardResearchPlan, DepthFirstResearchPlan, BreadthFirstResearchPlan

# Define ResearchPlan as a union type
ResearchPlan = StraightforwardResearchPlan | DepthFirstResearchPlan | BreadthFirstResearchPlan

feedback_analyzer_prompt = """
You are a feedback analyzer. You are responsible for analyzing the user's feedback on a research plan to decide how to proceed further in the research.
You are given the original analysis of the user query, the research plan, and the user's feedback on the plan.
Analyze the user feedback and decide whether to modify the existing research plan or develop a new one.

<guidelines_for_analyzing_the_feedback>
You have to make one of the following decisions based on the user feedback, the plan that was presented, and details from the previous query analysis:
- Do nothing and continue with the existing plan. This is the default option and should be considered when the user feedback is not significant or does not deviate significantly from the existing plan, or if the user approves the existing plan.
- Use most of the existing plan as it is and only add or change a few aspects of it to accomodate the users feedback.
- Reuse existing steps/aspects of the existing plan but redevelop a new plan with same or different approach to accomodate the users feedback.
- Develop a new research plan from scratch ONLY because the user feedback deviates significantly the existing plan and the query components analyzed previously. This is a costly operation and therefore should be considered when the user feedback absolutely necessitates it. Choosing this option will rerun the query analysis workflow again.
- The key to this decision is to compare the feedback with juxtaposed to the previously analyzed query components to deem if they deviate significantly.
- In addition you must provide feedback on how to modify the existing plan
</guidelines_for_analyzing_the_feedback>

"""

feedback_analyzer = Agent(
    name="feedback_analyzer",
    description="""This agent is responsible for analyzing human feedback and deciding whether to modify the existing research plan or develop a new one""",
    system_prompt=feedback_analyzer_prompt,
    model="gemini-2.5-flash",
    # tools=[ This will not work well. We need to setup the ui for this.
    #     handoff_to_user
    # ]
)



async def analyze_feedback(
        user_feedback: Optional[str]=None, 
        research_plan: Optional[ResearchPlan]=None, 
        query_analysis: Optional[Dict[str, Any]]=None
    ) -> str:
        prompt = """
        Here is the user feedback on the research plan:
        
        {user_feedback}
        
        The user feedback was for the following plan:

        {research_plan}

        Here is the query analysis based on which the plan was generated:
        
        Query Type: {query_type}
        Reasoning for the query type: {query_type_reasoning}
        
        Query Components:
        {query_components}"""
    
        prompt = Environment() \
        .from_string(prompt) \
        .render(
            user_feedback=user_feedback,
            research_plan=research_plan,
            query_type=query_analysis['query_type'],
            query_type_reasoning=query_analysis['query_type_reasoning'],
            query_components=query_analysis['query_components'],
        )


        return await feedback_analyzer.structured_output_async(HumanFeedbackDecision,prompt)


