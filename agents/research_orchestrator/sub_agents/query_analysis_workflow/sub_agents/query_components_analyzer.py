from strands import Agent
from domain import QueryComponents

query_components_analyzer_prompt = """
You are an expert at analyzing user queries and breaking them down systematically following a structured approach.
Use the following guidelines to break down the user's query:
- Identify the main concepts, key entities, and relationships in the task.
- List specific facts or data points needed to answer the question well.
- Note any temporal or contextual constraints on the question.
- Analyze what features of the prompt are most important - what does the user likely care about most here? What are they expecting or desiring in the final result? What tools do they expect to be used and how do we know?
- Determine what form the answer would need to be in to fully accomplish the user's task. Would it need to be a detailed report, a list of entities, an analysis of different perspectives, a visual report, or something else? What components will it need to have?

Provide your response in the following format:

<output_format>
{
    "main_concepts": List[str],
    "key_entities": List[str],
    "relationships": List[str],
    "temporal_constraints": Optional[List[str]],
    "important_features": List[str],
    "tools_needed": Optional[List[str]],
    "other_details": Optional[str]
}
</output_format>
"""

query_components_analyzer_agent = Agent(
    name="query_components_analyzer_agent",
    description="""This agent is responsible for analyzing the user's query and extracting the key components of the query.""",
    system_prompt=query_components_analyzer_prompt,
    model="gemini-2.5-flash"
)

async def query_components_analysis(query: str) -> QueryComponents:
    return await query_components_analyzer_agent.structured_output_async(QueryComponents, f"\n\nHere is the user's query:\n{query}")