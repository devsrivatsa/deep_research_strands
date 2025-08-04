from sub_agents.query_components_analyzer import query_components_analysis
from sub_agents.query_type_analyzer import query_type_analysis

async def query_analysis(query: str) -> dict:
    query_components = await query_components_analysis(query)
    query_type = await query_type_analysis(query_components)
    #TODO: save this as state somewhere.
    #TODO: save the query components and query type to the database.
    return {"query_type": query_type, "query_components": query_components}
