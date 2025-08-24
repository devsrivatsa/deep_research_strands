from pydantic import BaseModel
from typing import List, Optional, Literal, Annotated


class QueryComponents(BaseModel):
    main_concepts: List[str] = Annotated[List[str], "List of main concepts in the query"]
    key_entities: List[str] = Annotated[List[str], "List of key entities in the query"]
    relationships: List[str] = Annotated[List[str], "List of relationships between the key entities"]
    temporal_constraints: Optional[List[str]] = Annotated[Optional[List[str]], "List of temporal constraints on the query"]
    important_features: List[str] = Annotated[List[str], "List of important features of the query"]
    tools_needed: Optional[List[str]] = Annotated[Optional[List[str]], "List of tools needed to answer the query"]
    other_details: Optional[str] = Annotated[Optional[str], "Other details about the query"]


class QueryType(BaseModel):
    query_type: Literal["depth-first", "breadth-first", "straightforward"]
    reasoning: str = Annotated[str, "a short explanation of why you chose this query type"]