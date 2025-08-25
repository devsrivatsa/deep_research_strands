// Core data types for the Deep Research application

// ============================================================================
// Query Components Interface (matching backend domain.py structure)
// ============================================================================

export interface QueryComponents {
  main_concepts: string[];
  key_entities: string[];
  relationships: string[];
  temporal_constraints?: string[];
  important_features: string[];
  tools_needed?: string[];
  other_details?: string;
  // Legacy properties for backward compatibility
  queries?: SearchQuery[];
  concepts?: Concept[];
  entities?: Entity[];
}

// Additional types for QueryComponentsDisplay
export interface Concept {
  id: string;
  name: string;
  description?: string;
  confidence?: number;
}

export interface Entity {
  id: string;
  name: string;
  type?: string;
  description?: string;
  confidence?: number;
}

export interface Relationship {
  id: string;
  source: string;
  target: string;
  type: string;
  description?: string;
  confidence?: number;
}

export interface QueryType {
  query_type: "depth-first" | "breadth-first" | "straightforward";
  reasoning: string;
}

// ============================================================================
// Tool Call Types
// ============================================================================

export interface ToolCall {
  tool_name: string;
  tool_arguments: Record<string, string>[];
  number_of_calls: number;
}

export interface ParallelToolCall {
  tool_name: string;
  tool_args: Record<string, unknown>[];
  parallel_workers: number;
}

export interface ParallelToolCallConfig {
  tool_call_configs: ParallelToolCall[];
}

export interface ToolCallResult {
  tool_call_id: string;
  tool_name: string;
  tool_result: unknown;
  is_error: boolean;
  error_message: string;
}

// ============================================================================
// Research Output Types
// ============================================================================

export interface CompressedResearchOutput {
  findings: string;
  tool_calls: ToolCall[];
  sources_with_citations: Record<string, string>[];
}

export interface ResearchOutput {
  research_output: string;
}

export interface CompletedResearchTask {
  research_task: string;
  completed_research_tasks: string[];
  compress_research_output: CompressedResearchOutput;
}

// ============================================================================
// Research Progress Types (for real-time streaming)
// ============================================================================
export enum ResearchProgressType {
  TASK_STARTED = "task_started",
  TASK_PROGRESS = "task_progress", 
  TASK_COMPLETED = "task_completed",
  TASK_FAILED = "task_failed",
  JOB_COMPLETED = "job_completed",
  ALL_JOBS_COMPLETED = "all_jobs_completed"
}

export interface ResearchProgressEvent {
  type: "progress";
  event_type: ResearchProgressType;
  message: string;
  progress: number | null;
}

export interface ResearchFinalResultEvent {
  type: "final_result";
  result: CompressedResearchOutput | string;
}

export interface ResearchErrorEvent {
  type: "error";
  message: string;
}

export type ResearchWebSocketEvent = 
  | ResearchProgressEvent 
  | ResearchFinalResultEvent 
  | ResearchErrorEvent;

// ============================================================================
// Domain Events (for event-driven architecture)
// ============================================================================

export interface BaseDomainEvent {
  event_id: string;
  aggregate_id: string;
  event_type: string;
  timestamp: string;
  version: number;
  correlation_id?: string;
}

// Research Domain Events
export interface ResearchSessionStartedEvent extends BaseDomainEvent {
  event_type: "research_session_started";
  data: {
    session_id: string;
    query: string;
    user_id: string;
  };
}

export interface ResearchPlanGeneratedEvent extends BaseDomainEvent {
  event_type: "research_plan_generated";
  data: {
    session_id: string;
    plan: ResearchPlan;
  };
}

export interface ResearchTaskStartedEvent extends BaseDomainEvent {
  event_type: "research_task_started";
  data: {
    session_id: string;
    task_id: string;
    task_description: string;
  };
}

export interface ResearchTaskCompletedEvent extends BaseDomainEvent {
  event_type: "research_task_completed";
  data: {
    session_id: string;
    task_id: string;
    result: CompressedResearchOutput;
  };
}

export interface ResearchSessionCompletedEvent extends BaseDomainEvent {
  event_type: "research_session_completed";
  data: {
    session_id: string;
    final_result: string;
  };
}

// Project Domain Events
export interface ProjectCreatedEvent extends BaseDomainEvent {
  event_type: "project_created";
  data: {
    project_id: string;
    name: string;
    user_id: string;
  };
}

export interface ProjectArchivedEvent extends BaseDomainEvent {
  event_type: "project_archived";
  data: {
    project_id: string;
    user_id: string;
  };
}

// User Domain Events
export interface UserRegisteredEvent extends BaseDomainEvent {
  event_type: "user_registered";
  data: {
    user_id: string;
    email: string;
  };
}

export interface UserProfileUpdatedEvent extends BaseDomainEvent {
  event_type: "user_profile_updated";
  data: {
    user_id: string;
    changes: Record<string, unknown>;
  };
}

export type DomainEvent = 
  | ResearchSessionStartedEvent
  | ResearchPlanGeneratedEvent
  | ResearchTaskStartedEvent
  | ResearchTaskCompletedEvent
  | ResearchSessionCompletedEvent
  | ProjectCreatedEvent
  | ProjectArchivedEvent
  | UserRegisteredEvent
  | UserProfileUpdatedEvent;

// Event Handler Types
export interface EventHandler<T extends DomainEvent = DomainEvent> {
  handle(event: T): Promise<void>;
}

export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
}

// Event Stream Types (for SSE/polling endpoints)
export interface EventStreamMessage {
  event_id: string;
  event_type: string;
  data: unknown;
  timestamp: string;
}

export interface EventFilter {
  event_types?: string[];
  aggregate_ids?: string[];
  correlation_ids?: string[];
  from_timestamp?: string;
  to_timestamp?: string;
}

// ============================================================================
// Research Task Types
// ============================================================================

export interface SimpleTask {
  task_type: "Simple_Task";
  task_desc: string;
}

export interface DependentTask {
  task_type: "Dependent_Task";
  tasks: string[];
}

export interface ComplexTask {
  task_type: "Complex_Task";
  independent_tasks: string[];
  dependent_tasks: DependentTask[];
}

export interface ProcessedJob {
  job_desc: string;
  task_list: (SimpleTask | DependentTask | ComplexTask)[];
  tool_call_budget: number;
}

export interface ResearchJob {
  research_tasks: string[];
}

export interface ResearchActionPlan {
  research_tasks: ProcessedJob[];
}

export interface ParallelResearchConfig {
  research_jobs: ResearchJob[];
}

// ============================================================================
// Research Plan Types
// ============================================================================

export interface PlanElement {
  description: string;
  should_decompose: boolean;
  sub_steps?: string[];
  expected_output?: string;
  is_strictly_necessary: boolean;
}

export interface StraightforwardResearchPlan {
  direct_path: string;
  fact_finding_steps?: string[];
  key_data_points?: string[];
  sources_to_use?: string[];
  verification_steps?: string[];
  plan_elements?: PlanElement[];
}

export interface DepthFirstResearchPlan {
  approaches: string[];
  expert_viewpoints: string[];
  synthesis_method: string;
}

export interface BreadthFirstResearchPlan {
  sub_questions: string[];
  critical_sub_questions: string[];
  sub_agent_boundaries: Record<string, string>;
  aggregation_method: string;
}

// ============================================================================
// Feedback Types
// ============================================================================

export interface Feedback {
  research_task: string;
  incomplete_research_tasks: string[];
}

export interface FinalResearchReview {
  research_verdict: "research_complete" | "research_incomplete";
  research_tasks_completed: string[];
  research_tasks_missing: Record<string, string>[];
}

export interface HumanFeedbackDecision {
  action: "proceed" | "modify_existing" | "develop_new";
  modification_option?: "same_approach" | "different_approach";
  modification_feedback?: {
    change?: string;
    addition?: string;
    deletion?: string;
  };
}

// ============================================================================
// Research Plan and Report Section Types
// ============================================================================

export interface Section {
  name: string;
  description: string;
  research: boolean;
  content: string;
}

export interface ResearchPlan {
  sections: Section[];
}

export interface ReportSection extends Section {
  id?: string;
  status?: "pending" | "in_progress" | "completed" | "failed";
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// Chat Message Types
// ============================================================================

export type ChatMessageType =
  | "user"
  | "assistant"
  | "system"
  | "error"
  | "status"
  | "plan_update"
  | "section_update";

export interface ChatMessage {
  id: string;
  type: ChatMessageType;
  content: string;
  timestamp: string;
  metadata?: {
    section_name?: string;
    search_query?: string;
    status?: string;
    error_code?: string;
    [key: string]: unknown;
  };
}

// ============================================================================
// WebSocket Message Type Definitions
// ============================================================================

export type WebSocketMessageType =
  | "connection_established"
  | "connection_error"
  | "research_started"
  | "plan_generated"
  | "plan_feedback_requested"
  | "section_started"
  | "section_completed"
  | "section_failed"
  | "search_started"
  | "search_completed"
  | "report_completed"
  | "error"
  | "status_update"
  | "user_input_required";

export interface BaseWebSocketMessage {
  type: WebSocketMessageType;
  timestamp: string;
  session_id?: string;
}

export interface ConnectionEstablishedMessage extends BaseWebSocketMessage {
  type: "connection_established";
  data: {
    session_id: string;
    server_version?: string;
  };
}

export interface ResearchStartedMessage extends BaseWebSocketMessage {
  type: "research_started";
  data: {
    topic: string;
    configuration?: Record<string, unknown>;
  };
}

export interface PlanGeneratedMessage extends BaseWebSocketMessage {
  type: "plan_generated";
  data: {
    plan: ResearchPlan;
    topic: string;
  };
}

export interface PlanFeedbackRequestedMessage extends BaseWebSocketMessage {
  type: "plan_feedback_requested";
  data: {
    plan: ResearchPlan;
    message: string;
  };
}

export interface SectionStartedMessage extends BaseWebSocketMessage {
  type: "section_started";
  data: {
    section: Section;
    search_queries?: SearchQuery[];
  };
}

export interface SectionCompletedMessage extends BaseWebSocketMessage {
  type: "section_completed";
  data: {
    section: Section;
    content: string;
  };
}

export interface SearchStartedMessage extends BaseWebSocketMessage {
  type: "search_started";
  data: {
    queries: SearchQuery[];
    section_name?: string;
  };
}

export interface SearchCompletedMessage extends BaseWebSocketMessage {
  type: "search_completed";
  data: {
    results: string;
    section_name?: string;
  };
}

export interface ReportCompletedMessage extends BaseWebSocketMessage {
  type: "report_completed";
  data: {
    final_report: string;
    sections: Section[];
  };
}

export interface ErrorMessage extends BaseWebSocketMessage {
  type: "error";
  data: {
    error: string;
    error_code?: string;
    details?: Record<string, unknown>;
  };
}

export interface StatusUpdateMessage extends BaseWebSocketMessage {
  type: "status_update";
  data: {
    status: string;
    progress?: number;
    current_step?: string;
  };
}

export interface UserInputRequiredMessage extends BaseWebSocketMessage {
  type: "user_input_required";
  data: {
    message: string;
    input_type: "feedback" | "approval" | "selection";
    options?: string[];
  };
}

export interface ConnectionErrorMessage extends BaseWebSocketMessage {
  type: "connection_error";
  data: {
    error: string;
    details?: Record<string, unknown>;
  };
}

export interface SectionFailedMessage extends BaseWebSocketMessage {
  type: "section_failed";
  data: {
    section?: Section;
    error: string;
    details?: Record<string, unknown>;
  };
}

export type WebSocketMessage =
  | ConnectionEstablishedMessage
  | ConnectionErrorMessage
  | ResearchStartedMessage
  | PlanGeneratedMessage
  | PlanFeedbackRequestedMessage
  | SectionStartedMessage
  | SectionCompletedMessage
  | SectionFailedMessage
  | SearchStartedMessage
  | SearchCompletedMessage
  | ReportCompletedMessage
  | ErrorMessage
  | StatusUpdateMessage
  | UserInputRequiredMessage;

// ============================================================================
// API Response and Error Types
// ============================================================================

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: APIError;
  timestamp: string;
}

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack_trace?: string;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// Research session related API types
export interface CreateResearchSessionRequest {
  topic: string;
  configuration?: ResearchConfiguration;
}

export interface ResearchSessionResponse {
  session_id: string;
  topic: string;
  status: ResearchSessionStatus;
  created_at: string;
  updated_at: string;
  configuration?: ResearchConfiguration;
}

export type ResearchSessionStatus =
  | "created"
  | "planning"
  | "awaiting_feedback"
  | "researching"
  | "writing"
  | "completed"
  | "failed"
  | "cancelled";

export interface ResearchConfiguration {
  report_structure?: string | Record<string, unknown>;
  number_of_queries?: number;
  max_search_depth?: number;
  number_of_follow_up_queries?: number;
  search_api?: string;
  search_api_config?: Record<string, unknown>;
  writer_provider?: string;
  writer_model?: string;
  planner_provider?: string;
  planner_model?: string;
}

// Plan feedback API types
export interface SubmitPlanFeedbackRequest {
  session_id: string;
  feedback: string | boolean;
}

// Report export types
export interface ExportReportRequest {
  session_id: string;
  format: "pdf" | "markdown" | "html";
  options?: {
    include_metadata?: boolean;
    include_sources?: boolean;
  };
}

export interface ExportReportResponse {
  download_url: string;
  expires_at: string;
  format: string;
  file_size?: number;
}

// Project management types
export interface Project {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  sessions: ResearchSessionResponse[];
  status: "active" | "archived" | "deleted";
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
}

// ============================================================================
// Search Query Types
// ============================================================================

export interface SearchQuery {
  id: string;
  query: string;
  search_query: string; // Legacy property for backward compatibility
  status: "pending" | "in_progress" | "completed" | "failed";
  results?: string;
  created_at: string;
  updated_at?: string;
}



// ============================================================================
// State Management Types
// ============================================================================

export interface AppState {
  session: SessionState;
  chat: ChatState;
  ui: UIState;
}

export interface SessionState {
  current_session_id?: string;
  sessions: Record<string, ResearchSessionResponse>;
  current_plan?: ResearchPlan;
  current_report?: string;
  connection_status: "disconnected" | "connecting" | "connected" | "error";
}

export interface ChatState {
  messages: ChatMessage[];
  is_typing: boolean;
  input_value: string;
  awaiting_user_input: boolean;
  user_input_context?: UserInputRequiredMessage["data"];
}

export interface UIState {
  sidebar_collapsed: boolean;
  active_tab: "chat" | "plan" | "report" | "projects";
  theme: "light" | "dark" | "system";
  loading_states: Record<string, boolean>;
  error_states: Record<string, APIError | null>;
}

// ============================================================================
// Research WebSocket Event Handlers (for real-time streaming)
// ============================================================================

export interface ResearchWebSocketHandlers {
  onProgress?: (event: ResearchProgressEvent) => void;
  onFinalResult?: (event: ResearchFinalResultEvent) => void;
  onError?: (event: ResearchErrorEvent) => void;
}

// Type guard functions for research WebSocket events
export const isResearchProgressEvent = (event: ResearchWebSocketEvent): event is ResearchProgressEvent => {
  return event.type === "progress";
};

export const isResearchFinalResultEvent = (event: ResearchWebSocketEvent): event is ResearchFinalResultEvent => {
  return event.type === "final_result";
};

export const isResearchErrorEvent = (event: ResearchWebSocketEvent): event is ResearchErrorEvent => {
  return event.type === "error";
};

// ============================================================================
// Event-Driven WebSocket Types (for new architecture)
// ============================================================================

export interface EventDrivenWebSocketMessage {
  type: "domain_event" | "integration_event" | "ui_event";
  event: DomainEvent | ResearchWebSocketEvent | WebSocketMessage;
  correlation_id?: string;
}

export interface EventSubscription {
  event_types: string[];
  filters?: EventFilter;
  session_id: string;
}

export interface EventWebSocketHandlers {
  onDomainEvent?: (event: DomainEvent) => void;
  onIntegrationEvent?: (event: ResearchWebSocketEvent) => void;
  onUIEvent?: (event: WebSocketMessage) => void;
}
