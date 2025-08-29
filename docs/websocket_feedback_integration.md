# WebSocket-based Human Feedback Integration

## Overview

This document describes the implementation of websocket-based human feedback for the research orchestrator, replacing the blocking `manage_human_feedback()` calls with an event-driven, real-time approach.

## Architecture Changes

### 1. New Domain Event: `HumanFeedbackRequired`

**Location**: `domain/events/research_events.py`

**Purpose**: Signals that human feedback is required for a research plan

**Data Structure**:
```python
{
    "plan_presentation": str,      # Human-readable plan from plan_presenter
    "research_plan": Any,          # Original structured research plan
    "query_analysis": Dict,        # Query analysis context
    "revision_number": int,        # Plan revision number
    "requires_feedback": bool,     # Always True for this event
    "feedback_deadline": None      # Future: timeout mechanism
}
```

### 2. Enhanced Human Feedback Manager

**Location**: `agents/research_orchestrator/sub_agents/human_feedback_manager/`

**Components**:
- `plan_presenter.py` - Agent that converts structured plans to human-readable format
- `feedback_manager.py` - Agent that analyzes user feedback and returns decisions
- `__init__.py` - Exports `present_plan()` and `analyze_feedback()` functions

**Key Functions**:
```python
async def present_plan(research_plan: ResearchPlan, query_analysis: Dict) -> str
async def analyze_feedback(user_feedback: str, research_plan: ResearchPlan, query_analysis: Dict) -> HumanFeedbackDecision
```

### 3. WebSocket Integration

**Location**: `infrastructure/websockets/`

**New Handler**: `HumanFeedbackWebSocketHandler`
- Processes `HumanFeedbackRequired` events
- Sends plan presentation to UI via websocket
- Handles `HumanFeedbackReceived` events for confirmation

**Enhanced WebSocket Manager**:
- `handle_feedback_message()` - Processes incoming feedback from UI
- `register_feedback_callback()` - Registers callbacks for orchestrator integration
- `_session_feedback` - Stores feedback history per session

## Workflow Flow

### Before (Blocking):
```
Orchestrator → manage_human_feedback() → Wait for user input → Continue
```

### After (Event-Driven):
```
Orchestrator → present_plan() → Emit HumanFeedbackRequired → WebSocket → UI
UI → User provides feedback → WebSocket → Orchestrator → analyze_feedback() → Continue
```

## Implementation Details

### 1. Orchestrator Changes

**File**: `agents/research_orchestrator/agent.py`

**Changes**:
- Replaced `manage_human_feedback()` calls with `present_plan()`
- Added `HumanFeedbackRequired` event emission
- Maintained backward compatibility with console input (TODO: replace with websocket)

**Code Example**:
```python
# Present the plan to the user via websocket
plan_presentation = await present_plan(research_plan, query_analysis_result)

# Emit HumanFeedbackRequired event for websocket integration
feedback_event = HumanFeedbackRequired(
    session_id=session_id,
    plan_presentation=plan_presentation,
    research_plan=research_plan,
    query_analysis=query_analysis_result,
    revision_number=revision_no
)
await event_bus.publish(feedback_event)

# TODO: Replace console input with websocket feedback
# For now, use simple input to maintain functionality
```

### 2. WebSocket Message Format

**HumanFeedbackRequired Message**:
```json
{
    "type": "human_feedback_required",
    "session_id": "session-123",
    "plan_presentation": "Human-readable plan text...",
    "revision_number": 0,
    "timestamp": "2024-01-01T12:00:00Z",
    "ui": {
        "title": "Human Feedback Required",
        "message": "Please review the research plan and provide feedback",
        "status": "waiting_for_feedback",
        "progress": 15,
        "show_feedback_form": true,
        "feedback_form": {
            "plan_presentation": "Human-readable plan text...",
            "revision_number": 0,
            "requires_user_input": true
        }
    }
}
```

**Expected UI Feedback Response**:
```json
{
    "action": "modify_existing",
    "modification_option": "same_approach",
    "modification_feedback": {
        "retain": "Keep the overall approach",
        "change": "Minor adjustments as needed",
        "addition": "Include additional aspects",
        "deletion": "Remove unnecessary parts"
    }
}
```

## Usage Examples

### 1. Running the Demo

```bash
cd examples
python websocket_feedback_example.py
```

This demonstrates the complete feedback workflow without requiring a UI.

### 2. Integration with FastAPI

The websocket infrastructure is already integrated with FastAPI in `infrastructure/websockets/fastapi_integration.py`. The new feedback handler will automatically process feedback events.

### 3. Custom UI Integration

To integrate with a custom UI:

1. **Connect to websocket**: `/ws/research/{session_id}`
2. **Listen for feedback requests**: Messages with `type: "human_feedback_required"`
3. **Display plan**: Use `plan_presentation` from the message
4. **Collect feedback**: Present feedback form to user
5. **Send feedback**: Send feedback data back via websocket

## Future Enhancements

### 1. Replace Console Input
- Remove TODO comments and console input logic
- Implement proper websocket feedback waiting in orchestrator
- Add timeout mechanisms for feedback collection

### 2. Feedback Persistence
- Store feedback in database via repository pattern
- Add feedback analytics and reporting
- Support feedback history per session

### 3. Advanced UI Features
- Real-time plan preview updates
- Collaborative feedback (multiple users)
- Feedback templates and suggestions

### 4. Error Handling
- Feedback validation and error reporting
- Retry mechanisms for failed feedback
- Graceful degradation when websockets unavailable

## Testing

### 1. Unit Tests
- Test `present_plan()` function with various plan types
- Test `analyze_feedback()` with different feedback scenarios
- Test event emission and handling

### 2. Integration Tests
- Test complete feedback workflow end-to-end
- Test websocket message handling
- Test event bus integration

### 3. UI Tests
- Test websocket connection and message flow
- Test feedback form submission
- Test error handling and edge cases

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check if websocket endpoint is accessible
   - Verify session_id format and validity
   - Check CORS configuration if applicable

2. **Feedback Not Received**
   - Verify event bus is running
   - Check websocket handler registration
   - Monitor logs for error messages

3. **Plan Presentation Issues**
   - Verify plan_presenter agent is working
   - Check input data format
   - Monitor agent execution logs

### Debug Mode

Enable debug logging to see detailed websocket and event flow:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Conclusion

The websocket-based human feedback integration provides:

- **Real-time updates**: Immediate plan presentation to UI
- **Non-blocking workflow**: Orchestrator continues processing other tasks
- **Event-driven architecture**: Consistent with existing system design
- **Scalable feedback**: Multiple UI clients can connect to same session
- **Maintainable code**: Clear separation of concerns

The implementation maintains backward compatibility while providing the foundation for advanced UI integration and real-time collaboration features.
