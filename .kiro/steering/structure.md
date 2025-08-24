# Project Structure

## Root Directory

```
deepresearch-strands/
├── main.py                 # Application entry point
├── config.py              # Configuration management with Pydantic
├── domain.py              # Core domain models and types
├── pyproject.toml         # Python project configuration
├── .env.example           # Environment variables template
└── uv.lock               # Python dependency lock file
```

## Backend Structure

### Agents Directory
```
agents/
└── research_orchestrator/          # Main orchestration agent
    ├── agent.py                   # Core orchestrator logic
    ├── prompt.py                  # Prompt templates
    ├── state.py                   # State management
    └── sub_agents/                # Specialized sub-agents
        ├── query_analysis_workflow/
        ├── research_planner_agent/
        ├── human_feedback_manager/
        └── reserch_workflow/      # [Note: typo in original]
```

### Configuration
```
config/
├── base.yml              # Base configuration
├── dev.yml              # Development overrides
└── prod.yml             # Production overrides
```

## Frontend Structure (ui/)

```
ui/
├── deno.json            # Deno configuration and tasks
├── main.tsx            # Application entry point
├── index.html          # HTML template
└── src/
    ├── App.tsx         # Main application component
    ├── components/     # React components
    │   ├── ChatInterface.tsx
    │   ├── ResearchPlanViewer.tsx
    │   ├── ReportViewer.tsx
    │   ├── ErrorBoundary.tsx
    │   └── Toast.tsx
    ├── hooks/          # Custom React hooks
    │   ├── useAccessibility.ts
    │   └── useOfflineDetection.ts
    ├── store/          # Zustand state management
    │   ├── index.ts
    │   └── selectors.ts
    ├── types/          # TypeScript type definitions
    │   └── index.ts
    └── utils/          # Utility functions
        ├── APIClient.ts
        ├── accessibility.ts
        └── retry.ts
```

## Included Subproject

The repository includes the complete **Langfuse** project in the `langfuse/` directory - an open-source LLM engineering platform used for observability and tracing.

## Key Conventions

### Python Code Organization
- **Domain Models**: All Pydantic models in `domain.py`
- **Agent Structure**: Each agent has its own directory with `agent.py`, `prompt.py`, and `state.py`
- **Async Patterns**: All agents use async/await for concurrent operations
- **Type Safety**: Extensive use of Pydantic for data validation

### Frontend Code Organization
- **Component Structure**: Each component has corresponding `.test.tsx` and `.accessibility.test.tsx` files
- **Hook Pattern**: Custom hooks for reusable logic (accessibility, offline detection)
- **State Management**: Centralized Zustand store with selectors
- **Utility Functions**: Shared utilities with comprehensive test coverage

### Testing Structure
- **Python**: Tests alongside source code or in `__tests__/` directories
- **Frontend**: `.test.tsx` files alongside components, separate accessibility tests
- **Integration**: End-to-end tests in dedicated test directories

### Configuration Management
- **Environment**: `.env` files for secrets, YAML configs for application settings
- **Type Safety**: Pydantic models for configuration validation
- **Multi-environment**: Separate configs for dev/prod environments