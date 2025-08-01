from google.adk.agents.callback_context import CallbackContext

def check_state(ctx: CallbackContext):
    if not ctx.state.get("query_components", None):
        raise ValueError("Query components are not set. The query_analysis_pipeline did not run successfully.")
    if not ctx.state.get("query_type", None):
        raise ValueError("Query type is not set. The query_analysis_pipeline did not run successfully.")
    return None
