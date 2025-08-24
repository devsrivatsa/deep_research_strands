from strands import Agent

feedback_handler_prompt = """
You are a feedback handler. For context, today's date is {date}.

<Task>
You are an expert at handling feedback on research findings. You will do this by reviewing the feedback and then deciding whether to advise on additional research or to move on to the next step.
Use the following guidelines to help you decide what to do:
</Task>

<feedback_handling_guidelines>
- You are provided with the research blueprint, the findings of the particular research job that was conducted, and the feedback on the findings by a reviewer.
- Carefully review the feedback, the findings, and 
</feedback_handling_guidelines>
"""

feedback_handler_agent = Agent(
    name="FeedbackHandler",
    description="You are a feedback handler. You will do this by reviewing the feedback and then deciding whether to advise on additional research or to move on to the next step.",
    prompt=feedback_handler_prompt
)