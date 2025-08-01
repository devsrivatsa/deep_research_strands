from google.adk.agents import Agent
from pydantic import BaseModel, Annotated, Optional
from typing import List

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

class QueryComponents(BaseModel):
    main_concepts: List[str] = Annotated[List[str], "List of main concepts in the query"]
    key_entities: List[str] = Annotated[List[str], "List of key entities in the query"]
    relationships: List[str] = Annotated[List[str], "List of relationships between the key entities"]
    temporal_constraints: Optional[List[str]] = Annotated[Optional[List[str]], "List of temporal constraints on the query"]
    important_features: List[str] = Annotated[List[str], "List of important features of the query"]
    tools_needed: Optional[List[str]] = Annotated[Optional[List[str]], "List of tools needed to answer the query"]
    other_details: Optional[str] = Annotated[Optional[str], "Other details about the query"]


query_components_analyzer_agent = Agent(
    name="query_components_analyzer_agent",
    description="""This agent is responsible for analyzing the user's query and extracting the key components of the query.""",
    instructions=query_components_analyzer_prompt,
    model="gemini-2.5-flash",
    output_key="query_components",
    output_schema=QueryComponents,
)
