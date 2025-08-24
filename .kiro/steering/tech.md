# Technology Stack

## Backend (Python)

- **Framework**: Python 3.11+ with asyncio for concurrent operations
- **Agent Framework**: Strands Agents with Anthropic and Ollama integrations
- **Configuration**: Pydantic models for type-safe configuration management
- **Environment**: python-dotenv for environment variable management
- **Observability**: Langfuse for LLM tracing and monitoring
- **Template Engine**: Jinja2 for prompt templating

### Key Dependencies
```
strands-agents[anthropic,ollama,otel]>=1.0.1
strands-agents-tools>=0.2.1
langfuse>=3.2.1
jinja2>=3.1.6
```

## Frontend (TypeScript/React)

- **Runtime**: Deno with TypeScript
- **Framework**: React 18.2.0 with functional components and hooks
- **State Management**: Zustand for global state
- **Styling**: Tailwind CSS for utility-first styling
- **Utilities**: clsx for conditional classes
- **Export Features**: html2canvas and jspdf for report generation

### Import Map (Deno)
All dependencies are loaded via ESM from esm.sh CDN, including React, Zustand, and utility libraries.

## Development Tools

### Python
```bash
# Development environment
uv venv
source .venv/bin/activate
uv pip install -e ".[dev]"

# Run main application
python main.py

# Jupyter notebooks for experimentation
jupyter lab notebooks/
```

### Frontend (Deno)
```bash
# Development server
deno task dev

# Build for production
deno task build

# Run tests
deno task test

# Format code
deno task fmt

# Lint code
deno task lint
```

**Important**: The project uses Deno's built-in testing framework, not Jest or React Testing Library. Create simpler tests that work with Deno's testing framework using `Deno.test()` and basic assertions.

## Configuration

- **Environment Variables**: Stored in `.env` (see `.env.example`)
- **Config Management**: `config.py` with Pydantic models
- **Required APIs**: Google API, Exa API, NCBI API, Langfuse keys

## Architecture Patterns

- **Async/Await**: All Python operations use asyncio patterns
- **Type Safety**: Pydantic models for data validation
- **Agent Orchestration**: Multi-agent workflows with state management
- **Observability**: Comprehensive tracing with Langfuse integration
- **Modular Design**: Separate agents for different research phases