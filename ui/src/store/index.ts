// Zustand store implementation for Deep Research application
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
  AppState,
  SessionState,
  ChatState,
  UIState,
  ChatMessage,
  ResearchPlan,
  ResearchSessionResponse,
  WebSocketMessage,
  APIError,
} from "../types/index.ts";

// ============================================================================
// Store Actions Interface
// ============================================================================

interface SessionActions {
  setCurrentSession: (sessionId: string) => void;
  addSession: (session: ResearchSessionResponse) => void;
  updateSession: (sessionId: string, updates: Partial<ResearchSessionResponse>) => void;
  removeSession: (sessionId: string) => void;
  setCurrentPlan: (plan: ResearchPlan | undefined) => void;
  setCurrentReport: (report: string | undefined) => void;
  setConnectionStatus: (status: SessionState["connection_status"]) => void;
  clearCurrentSession: () => void;
}

interface ChatActions {
  addMessage: (message: ChatMessage) => void;
  updateMessage: (messageId: string, updates: Partial<ChatMessage>) => void;
  removeMessage: (messageId: string) => void;
  clearMessages: () => void;
  setIsTyping: (isTyping: boolean) => void;
  setInputValue: (value: string) => void;
  setAwaitingUserInput: (awaiting: boolean, context?: ChatState["user_input_context"]) => void;
  handleWebSocketMessage: (message: WebSocketMessage) => void;
}

interface UIActions {
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActiveTab: (tab: UIState["active_tab"]) => void;
  setTheme: (theme: UIState["theme"]) => void;
  setLoadingState: (key: string, loading: boolean) => void;
  setErrorState: (key: string, error: APIError | null) => void;
  clearErrorStates: () => void;
}

type StoreActions = SessionActions & ChatActions & UIActions;

// ============================================================================
// Initial State
// ============================================================================

const initialSessionState: SessionState = {
  current_session_id: undefined,
  sessions: {},
  current_plan: undefined,
  current_report: undefined,
  connection_status: "disconnected",
};

const initialChatState: ChatState = {
  messages: [],
  is_typing: false,
  input_value: "",
  awaiting_user_input: false,
  user_input_context: undefined,
};

const initialUIState: UIState = {
  sidebar_collapsed: false,
  active_tab: "chat",
  theme: "system",
  loading_states: {},
  error_states: {},
};

const initialState: AppState = {
  session: initialSessionState,
  chat: initialChatState,
  ui: initialUIState,
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useAppStore = create<AppState & StoreActions>()(
  persist(
    immer((set, get) => ({
      ...initialState,

      // Session Actions
      setCurrentSession: (sessionId: string) =>
        set((state) => {
          state.session.current_session_id = sessionId;
        }),

      addSession: (session: ResearchSessionResponse) =>
        set((state) => {
          state.session.sessions[session.session_id] = session;
        }),

      updateSession: (sessionId: string, updates: Partial<ResearchSessionResponse>) =>
        set((state) => {
          if (state.session.sessions[sessionId]) {
            Object.assign(state.session.sessions[sessionId], updates);
          }
        }),

      removeSession: (sessionId: string) =>
        set((state) => {
          delete state.session.sessions[sessionId];
          if (state.session.current_session_id === sessionId) {
            state.session.current_session_id = undefined;
            state.session.current_plan = undefined;
            state.session.current_report = undefined;
          }
        }),

      setCurrentPlan: (plan: ResearchPlan | undefined) =>
        set((state) => {
          state.session.current_plan = plan;
        }),

      setCurrentReport: (report: string | undefined) =>
        set((state) => {
          state.session.current_report = report;
        }),

      setConnectionStatus: (status: SessionState["connection_status"]) =>
        set((state) => {
          state.session.connection_status = status;
        }),

      clearCurrentSession: () =>
        set((state) => {
          state.session.current_session_id = undefined;
          state.session.current_plan = undefined;
          state.session.current_report = undefined;
          state.chat.messages = [];
          state.chat.awaiting_user_input = false;
          state.chat.user_input_context = undefined;
        }),

      // Chat Actions
      addMessage: (message: ChatMessage) =>
        set((state) => {
          state.chat.messages.push(message);
        }),

      updateMessage: (messageId: string, updates: Partial<ChatMessage>) =>
        set((state) => {
          const messageIndex = state.chat.messages.findIndex((msg) => msg.id === messageId);
          if (messageIndex !== -1) {
            Object.assign(state.chat.messages[messageIndex], updates);
          }
        }),

      removeMessage: (messageId: string) =>
        set((state) => {
          state.chat.messages = state.chat.messages.filter((msg) => msg.id !== messageId);
        }),

      clearMessages: () =>
        set((state) => {
          state.chat.messages = [];
        }),

      setIsTyping: (isTyping: boolean) =>
        set((state) => {
          state.chat.is_typing = isTyping;
        }),

      setInputValue: (value: string) =>
        set((state) => {
          state.chat.input_value = value;
        }),

      setAwaitingUserInput: (awaiting: boolean, context?: ChatState["user_input_context"]) =>
        set((state) => {
          state.chat.awaiting_user_input = awaiting;
          state.chat.user_input_context = context;
        }),

      handleWebSocketMessage: (message: WebSocketMessage) =>
        set((state) => {
          // Convert WebSocket message to chat message
          const chatMessage: ChatMessage = {
            id: crypto.randomUUID(),
            type: message.type === "error" ? "error" : "system",
            content: getMessageContent(message),
            timestamp: message.timestamp,
            metadata: getMessageMetadata(message),
          };

          state.chat.messages.push(chatMessage);

          // Handle specific message types
          switch (message.type) {
            case "connection_established":
              state.session.connection_status = "connected";
              if ((message as any).data.session_id) {
                state.session.current_session_id = (message as any).data.session_id;
              }
              break;

            case "connection_error":
              state.session.connection_status = "error";
              break;

            case "plan_generated":
              state.session.current_plan = (message as any).data.plan;
              break;

            case "plan_feedback_requested":
              state.session.current_plan = (message as any).data.plan;
              state.chat.awaiting_user_input = true;
              state.chat.user_input_context = {
                message: (message as any).data.message,
                input_type: "feedback",
              };
              break;

            case "report_completed":
              state.session.current_report = (message as any).data.final_report;
              break;

            case "user_input_required":
              state.chat.awaiting_user_input = true;
              state.chat.user_input_context = (message as any).data;
              break;

            case "error":
              state.ui.error_states.websocket = {
                code: (message as any).data.error_code || "WEBSOCKET_ERROR",
                message: (message as any).data.error,
                details: (message as any).data.details,
              };
              break;
          }
        }),

      // UI Actions
      setSidebarCollapsed: (collapsed: boolean) =>
        set((state) => {
          state.ui.sidebar_collapsed = collapsed;
        }),

      setActiveTab: (tab: UIState["active_tab"]) =>
        set((state) => {
          state.ui.active_tab = tab;
        }),

      setTheme: (theme: UIState["theme"]) =>
        set((state) => {
          state.ui.theme = theme;
        }),

      setLoadingState: (key: string, loading: boolean) =>
        set((state) => {
          if (loading) {
            state.ui.loading_states[key] = true;
          } else {
            delete state.ui.loading_states[key];
          }
        }),

      setErrorState: (key: string, error: APIError | null) =>
        set((state) => {
          if (error) {
            state.ui.error_states[key] = error;
          } else {
            delete state.ui.error_states[key];
          }
        }),

      clearErrorStates: () =>
        set((state) => {
          state.ui.error_states = {};
        }),
    })),
    {
      name: "deep-research-app-state",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist UI preferences and session IDs, not full session data
        ui: {
          sidebar_collapsed: state.ui.sidebar_collapsed,
          active_tab: state.ui.active_tab,
          theme: state.ui.theme,
        },
        session: {
          current_session_id: state.session.current_session_id,
        },
      }),
    }
  )
);

// ============================================================================
// Helper Functions
// ============================================================================

function getMessageContent(message: WebSocketMessage): string {
  switch (message.type) {
    case "connection_established":
      return "Connected to research server";
    case "connection_error":
      return "Connection error occurred";
    case "research_started":
      return `Research started for topic: ${(message as any).data.topic}`;
    case "plan_generated":
      return "Research plan has been generated";
    case "plan_feedback_requested":
      return (message as any).data.message;
    case "section_started":
      return `Started researching section: ${(message as any).data.section.name}`;
    case "section_completed":
      return `Completed section: ${(message as any).data.section.name}`;
    case "section_failed":
      return `Failed to complete section: ${(message as any).data.section?.name || "Unknown"}`;
    case "search_started":
      return `Starting search with ${(message as any).data.queries.length} queries`;
    case "search_completed":
      return "Search completed";
    case "report_completed":
      return "Research report has been completed";
    case "error":
      return `Error: ${(message as any).data.error}`;
    case "status_update":
      return (message as any).data.status;
    case "user_input_required":
      return (message as any).data.message;
    default:
      return "System message";
  }
}

function getMessageMetadata(message: WebSocketMessage): ChatMessage["metadata"] {
  const metadata: ChatMessage["metadata"] = {};

  switch (message.type) {
    case "section_started":
    case "section_completed":
      metadata.section_name = (message as any).data.section.name;
      break;
    case "search_started":
      metadata.search_query = (message as any).data.queries.map((q: any) => q.search_query).join(", ");
      break;
    case "status_update":
      metadata.status = (message as any).data.status;
      metadata.progress = (message as any).data.progress;
      metadata.current_step = (message as any).data.current_step;
      break;
    case "error":
      metadata.error_code = (message as any).data.error_code;
      break;
  }

  return metadata;
}