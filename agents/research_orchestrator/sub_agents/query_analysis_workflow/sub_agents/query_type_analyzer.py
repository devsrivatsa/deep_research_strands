from strands import Agent
from domain import QueryType, QueryComponents

query_type_analyzer_prompt = """
You are an expert at analyzing user queries and determining the type of query. Your task is to carefully analyze the query and determine which of the 3 categories it falls into.
In our previous analysis, we have already broken down the user's query into <main_concepts>, <key_entities>, <relationships>, <temporal_constraints>, <important_features>, <tools_needed>, and <other_details>.
Use the following guidelines to determine the type of query:
- Depth-first query: When the problem requires multiple perspectives on the same issue, and calls for "going deep" by analyzing a single topic from many angles.
  - Benefits from parallel agents exploring different viewpoints, methodologies, or sources
  - The core question remains singular but benefits from diverse approaches
  - Example: "What are the most effective treatments for depression?" (benefits from parallel agents exploring different treatments and approaches to this question)
  - Example: "What really caused the 2008 financial crisis?" (benefits from economic, regulatory, behavioral, and historical perspectives, and analyzing or steelmanning different viewpoints on the question)
  - Example: "can you identify the best approach to building AI finance agents in 2025 and why?"
- Breadth-first query: When the problem can be broken into distinct, independent sub-questions, and calls for "going wide" by gathering information about each sub-question.
  - Benefits from parallel agents each handling separate sub-topics.
  - The query naturally divides into multiple parallel research streams or distinct, independently researchable sub-topics
  - Example1: "Compare the economic systems of three Nordic countries" (benefits from simultaneous independent research on each country)
  - Example2: "What are the net worths and names of all the CEOs of all the fortune 500 companies?" (intractable to research in a single thread; most efficient to split up into many distinct research agents which each gathers some of the necessary information)
  - Example3: "Compare all the major frontend frameworks based on performance, learning curve, ecosystem, and industry adoption" (best to identify all the frontend frameworks and then research all of these factors for each framework)
- Straightforward query: When the problem is focused, well-defined, and can be effectively answered by a single focused investigation or fetching a single resource from the internet.
  - Can be handled effectively by a single subagent with clear instructions; does not benefit much from extensive research
  - Example1: "What is the current population of Tokyo?" (simple fact-finding)
  - Example2: "What are all the fortune 500 companies?" (just requires finding a single website with a full list, fetching that list, and then returning the results)
  - Example3: "Tell me about bananas" (fairly basic, short question that likely does not expect an extensive answer)

Provide your response in the following format:
<output_format>
{
    "query_type": "depth-first" | "breadth-first" | "straightforward"
    "reasoning": (a short explanation of why you chose this query type)
}
</output_format>
"""

query_type_analyzer_agent = Agent(
    name="query_type_analyzer_agent",
    description="""This agent is responsible for analyzing the user's query and determining the type of query.""",
    system_prompt=query_type_analyzer_prompt,
    model="gemini-2.5-flash"
)

async def query_type_analysis(query_components: QueryComponents) -> QueryType:
    components_prompt = f"""
    <main_concepts>
    {"\n".join(query_components.main_concepts)}
    </main_concepts>

    <key_entities>
    {"\n".join(query_components.key_entities)}
    </key_entities>

    <relationships>
    {"\n".join(query_components.relationships)}
    </relationships>
    
    <temporal_constraints>
    {"\n".join(query_components.temporal_constraints)}
    </temporal_constraints>

    <important_features>
    {"\n".join(query_components.important_features)}
    </important_features>

    <tools_needed>
    {"\n".join(query_components.tools_needed) if query_components.tools_needed else ""}
    </tools_needed>

    <other_details>
    {query_components.other_details if query_components.other_details else ""}
    </other_details>
    """

    return await query_type_analyzer_agent.structured_output_async(QueryType, f"\n\nHere is the user's query broken down into components:\n{components_prompt}")