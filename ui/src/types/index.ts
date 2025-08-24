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
  tool_args: Record<string, any>[];
  parallel_workers: number;
}

export interface ParallelToolCallConfig {
  tool_call_configs: ParallelToolCall[];
}

export interface ToolCallResult {
  tool_call_id: string;
  tool_name: string;
  tool_result: any;
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
    [key: string]: any;
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
    configuration?: Record<string, any>;
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
    details?: Record<string, any>;
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
    details?: Record<string, any>;
  };
}

export interface SectionFailedMessage extends BaseWebSocketMessage {
  type: "section_failed";
  data: {
    section?: Section;
    error: string;
    details?: Record<string, any>;
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

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: APIError;
  timestamp: string;
}

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, any>;
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
  report_structure?: string | Record<string, any>;
  number_of_queries?: number;
  max_search_depth?: number;
  number_of_follow_up_queries?: number;
  search_api?: string;
  search_api_config?: Record<string, any>;
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
// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

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
