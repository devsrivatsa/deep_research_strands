# Phase 4: Clean Architecture Hardening and Minimal Interfaces

Status: Planned

Scope: Implement clean architecture boundaries for project, user, and events; formalize repository and service interfaces; introduce a light application layer; and redesign `human_feedback_manager` while keeping the current overall system (no Phase 3B advanced agents).

## Objectives

- Establish application layer (use-cases) that orchestrates domain services and repositories without leaking infrastructure concerns.
- Define and implement repository interfaces for `User`, `Project`, `ResearchSession/Events` and provide minimal infrastructure implementations.
- Provide a concrete `EventBus` binding and handler wiring at composition root.
- Expose minimal API endpoints (or service interfaces) for project/user/session management.
- Redesign `human_feedback_manager` to cleanly separate: presentation prompts, decision schema, and event emission.

## Target Architecture (Incremental)

1) Domain (unchanged, extend only as needed)
   - Entities: `user.py`, `project.py`, `research.py`, `query.py`.
   - Events: `research_events.py`, `workflow_events.py`, `agent_events.py` and base `DomainEvent`, `EventBus`.
   - Repositories: finalize interfaces in `domain/repositories/*.py` (currently placeholders for user/project/event/research).
   - Services: `DomainEventBus` interface remains as port; consider domain-level services if app logic grows.

2) Application Layer (new)
   - `application/`
     - `use_cases/`
       - `projects/create_project.py`
       - `projects/archive_project.py`
       - `users/register_user.py`
       - `research/start_session.py`, `research/get_status.py`, `research/cancel_session.py`
     - `interfaces/` (ports)
       - `auth_service.py` (optional)
       - `event_publisher.py` (wraps DomainEventBus)
     - `dto/` (optional): request/response models decoupled from transport.

3) Infrastructure Layer (incremental)
   - `infrastructure/repositories/` (new)
     - `user_repository_impl.py`
     - `project_repository_impl.py`
     - `research_repository_impl.py` (sessions, plans, results)
     - `event_repository_impl.py` (optional: audit/persisted events)
   - `infrastructure/events/simple_event_bus.py` already present; keep as default bus.
   - Observability: keep `langfuse_telemetry_manager.py` (no change).

4) Presentation/API (minimal)
   - Add minimal FastAPI endpoints (if desired) or retain CLI/examples.
   - Endpoints: `POST /projects`, `PATCH /projects/{id}/archive`, `POST /users`, `POST /research/sessions`, `GET /research/sessions/{id}`, `POST /research/sessions/{id}/cancel`.
   - Wire endpoints to application use-cases.

## Human Feedback Manager Redesign

Goals:
- Separate presentation (plan summarization) from decision logic.
- Use explicit schemas for input/output; avoid embedding JSON structures in prose.
- Emit `HumanFeedbackReceived` events and `AgentDecisionPoint` from orchestrator boundary.

Design:
- `agents/research_orchestrator/sub_agents/human_feedback_manager/`
  - `prompt_presenter.py`: Renders concise human-facing plan summary from `StraightforwardResearchPlan | DepthFirstResearchPlan | BreadthFirstResearchPlan` and prior `QueryComponents/QueryType`.
  - `decision_analyzer.py`: Produces `HumanFeedbackDecision` strictly via structured output, validating: `action`, `modification_option`, `modification_feedback`, `new_query`.
  - `agent.py`: Coordinates presenter + analyzer; no event or repository logic inside; returns `HumanFeedbackDecision` only.
- Orchestrator (`agents/research_orchestrator/agent.py`):
  - Emits `AgentDecisionPoint` before invoking HFM.
  - After result, emits `HumanFeedbackReceived(session_id, feedback_type, feedback_data, revision_number)`.

Notes:
- Do not introduce multi-agent collaboration or dynamic agent creation in this phase.
- Keep current model `gemini-2.5-flash` unless configured otherwise.

## Repository Interfaces (to finalize)

- `UserRepository` (domain/repositories/user_repository.py)
  - `create(user: User) -> User`
  - `get_by_email(email: str) -> Optional[User]`
  - `get(user_id: UUID) -> Optional[User]`
  - `update(user: User) -> User`

- `ProjectRepository` (domain/repositories/project_repository.py)
  - `create(project: Project) -> Project`
  - `get(project_id: UUID) -> Optional[Project]`
  - `list_by_user(user_id: UUID) -> List[Project]`
  - `archive(project_id: UUID) -> None`

- `ResearchRepository` (domain/repositories/research_repository.py)
  - `create_session(session: ResearchSession) -> ResearchSession`
  - `update_session(session: ResearchSession) -> ResearchSession`
  - `get_session(session_id: UUID) -> Optional[ResearchSession]`

- `EventRepository` (domain/repositories/event_repository.py) [optional]
  - `append(event: DomainEvent) -> None`
  - `list_by_session(session_id: str) -> List[DomainEvent]`

## Use-Case Sketches

- Create Project
  - Input: name, description, user_id
  - Flow: validate → `ProjectRepository.create` → emit `ProjectCreated` (optional) → return DTO

- Start Research Session
  - Input: `project_id`, `query`, `tool_calls_budget`
  - Flow: create `ResearchSession` → emit `ResearchSessionStarted` → orchestrator kicks off planning → return `session_id`

- Get Research Status
  - Input: `session_id`
  - Flow: query `ResearchRepository.get_session` and/or progress tracker handler state → map to DTO

- Cancel Research Session
  - Input: `session_id`, `reason`
  - Flow: update session state → emit `ResearchSessionCancelled`

## Composition Root

- Provide a factory to instantiate:
  - `SimpleEventBus`, subscribe `ResearchProgressTracker`, `ResearchMetricsCollector`, and Langfuse variants.
  - Repository implementations.
  - Use-cases wired with repositories and `EventBus`.

## Deliverables

- Application layer skeleton (`application/use_cases`, `application/interfaces`, optional `application/dto`).
- Repository interfaces finalized; minimal infrastructure implementations.
- Minimal API endpoints (optional) wired to use-cases.
- Refactored `human_feedback_manager` into presenter + analyzer.

## Out of Scope (Explicit)

- Phase 3B “Advanced Agent Features”: agent collaboration, dynamic agent creation, state persistence beyond current needs.
- MCP/server/tooling.
- Full event sourcing/CQRS (may be a future phase).

## Acceptance Criteria

- Clear separation of layers; domain has no infra imports.
- Use-cases operate only on repositories and `EventBus` interfaces.
- `human_feedback_manager` returns validated `HumanFeedbackDecision` and does not perform side effects.
- End-to-end flow: start session → plan → (optional) feedback → execute → complete, with events visible in handlers/Langfuse.


