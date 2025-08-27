# DeepResearch Event-Driven Architecture Implementation Plan
Version: 1.0
Date: 2024-03-21

## Overview

This document outlines the plan for implementing event-driven architecture in the DeepResearch project,
integrating existing research_events_example.py and frontend_streaming_example.py while maintaining
WebSocket functionality for real-time updates.

## Key Design Decisions

1. Event Separation
   - Domain Events: Core business logic events (e.g., ResearchSessionStarted)
   - Integration Events: Cross-boundary communication (e.g., ResearchProgressUpdate)
   - UI Events: Presentation layer updates (e.g., WebSocketMessage)

2. WebSocket Strategy
   - Maintain WebSockets for real-time UI updates
   - Domain events trigger WebSocket messages indirectly
   - Support multiple UI client subscriptions to same events
   - Event-driven WebSocket communication replaces direct agent communication

3. Backward Compatibility
   - Existing ResearchProgress becomes an integration event
   - Current streaming code transforms to event-driven pattern
   - Gradual migration approach - no big bang changes

## Implementation Phases

### Phase 1: Domain Events Foundation (Week 1)

1. Move & Enhance Existing Code:
   ```
   research_events_example.py → domain/events/
   - domain/events/base.py           # From ResearchEventBus base
   - domain/events/research_events.py # From ResearchEventType enum
   ```

2. Create Base Event Infrastructure:
   ```python
   # domain/events/base.py
   class DomainEvent(ABC):
       event_id: UUID
       aggregate_id: str
       event_type: str
       timestamp: datetime
       version: int
       
   class EventPublisher(ABC):
       async def publish(self, event: DomainEvent) -> None
   ```

### Phase 2: WebSocket Integration (Week 2)

1. Enhance WebSocket Manager:
   ```
   frontend_streaming_example.py → infrastructure/events/
   - infrastructure/events/websocket_manager.py
   ```

2. Create Event-to-WebSocket Bridge:
   ```python
   @event_handler(ResearchTaskStartedEvent)
   async def notify_ui_task_started(event: ResearchTaskStartedEvent):
       await websocket_manager.send_progress_update(event.session_id, {
           "type": "task_started",
           "task_id": event.task_id,
           "message": event.message
       })
   ```

### Phase 3: Agent Integration (Week 3)

1. Inject Event Bus into Agents:
   ```python
   async def orchestrate_research(event_bus: EventPublisher):
       await event_bus.publish(ResearchSessionStartedEvent(session_id, query))
   ```

2. Transform direct WebSocket calls to event emissions

### Phase 4: MCP Integration (Week 4)

1. Create MCP Event Bridge:
   ```python
   @event_handler(ResearchTaskCompletedEvent)
   async def update_mcp_clients(event: ResearchTaskCompletedEvent):
       # Notify MCP clients of research progress
   ```

## Event Flow Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Research      │───▶│   Domain Event   │───▶│   Event Bus     │
│   Orchestrator  │    │   (Pure Domain)  │    │   (Application) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        │
                              ┌─────────────────────────┼─────────────────────────┐
                              │                         │                         │
                              ▼                         ▼                         ▼
                    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
                    │   Database      │    │   WebSocket     │    │   External      │
                    │   (Audit Trail) │    │   (UI Updates)  │    │   APIs/MCP      │
                    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Integration Points

1. research_events_example.py → domain/events/research_events.py
   - Transform existing event types into domain events
   - Enhance with proper event metadata and validation

2. frontend_streaming_example.py → infrastructure/events/websocket_manager.py
   - Convert to event-driven WebSocket updates
   - Implement event handler registration for UI updates

3. ResearchProgress Enhancement
   - Add domain event correlation IDs
   - Maintain backward compatibility
   - Add event sourcing capabilities

4. WebSocket Communication
   - Event-driven updates replace direct agent communication
   - Implement event filtering and routing
   - Add reconnection and error handling

5. MCP Integration
   - Event-driven tool execution
   - State management through events
   - Bidirectional event flow with MCP protocol

## Benefits

1. Decoupled Components
   - Clean separation between business logic and presentation
   - Easier testing and maintenance
   - Independent scaling of components

2. Enhanced Observability
   - Complete audit trail of research operations
   - Better debugging capabilities
   - Performance monitoring through event flow

3. Extensibility
   - Easy addition of new event handlers
   - Simple integration with external systems
   - Support for future analytics

## Migration Strategy

1. Incremental Approach
   - Start with research domain events
   - Gradually add user and project events
   - Phase out direct WebSocket calls

2. Testing Strategy
   - Unit tests for event handlers
   - Integration tests for event flow
   - End-to-end tests for critical paths

3. Monitoring
   - Event flow metrics
   - Handler performance tracking
   - Error rate monitoring

## Next Steps

1. Create base event infrastructure
2. Transform existing events
3. Implement WebSocket bridge
4. Add agent integration
5. Deploy incrementally

## References

1. Original architecture.txt
2. research_events_example.py
3. frontend_streaming_example.py
4. Updated architecture_with_events.txt

## Notes

- Keep existing functionality working during migration
- Document all event types and their purpose
- Monitor performance impact
- Regular backups of event store
- Consider event versioning strategy early
