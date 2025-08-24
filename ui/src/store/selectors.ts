// Selectors for accessing specific parts of the app state
import type { AppState } from "../types/index.ts";
import { useAppStore } from "./index.ts";

// ============================================================================
// Session Selectors
// ============================================================================

export const useCurrentSession = () =>
  useAppStore((state) => {
    const sessionId = state.session.current_session_id;
    return sessionId ? state.session.sessions[sessionId] : undefined;
  });

export const useCurrentSessionId = () =>
  useAppStore((state) => state.session.current_session_id);

export const useAllSessions = () =>
  useAppStore((state) => Object.values(state.session.sessions));

export const useSessionById = (sessionId: string) =>
  useAppStore((state) => state.session.sessions[sessionId]);

export const useCurrentPlan = () =>
  useAppStore((state) => state.session.current_plan);

export const useCurrentReport = () =>
  useAppStore((state) => state.session.current_report);

export const useConnectionStatus = () =>
  useAppStore((state) => state.session.connection_status);

export const useIsConnected = () =>
  useAppStore((state) => state.session.connection_status === "connected");

// ============================================================================
// Chat Selectors
// ============================================================================

export const useChatMessages = () =>
  useAppStore((state) => state.chat.messages);

export const useLatestMessage = () =>
  useAppStore((state) => {
    const messages = state.chat.messages;
    return messages.length > 0 ? messages[messages.length - 1] : undefined;
  });

export const useMessagesByType = (type: string) =>
  useAppStore((state) => state.chat.messages.filter((msg) => msg.type === type));

export const useIsTyping = () =>
  useAppStore((state) => state.chat.is_typing);

export const useChatInputValue = () =>
  useAppStore((state) => state.chat.input_value);

export const useAwaitingUserInput = () =>
  useAppStore((state) => state.chat.awaiting_user_input);

export const useUserInputContext = () =>
  useAppStore((state) => state.chat.user_input_context);

export const useHasMessages = () =>
  useAppStore((state) => state.chat.messages.length > 0);

// ============================================================================
// UI Selectors
// ============================================================================

export const useIsSidebarCollapsed = () =>
  useAppStore((state) => state.ui.sidebar_collapsed);

export const useActiveTab = () =>
  useAppStore((state) => state.ui.active_tab);

export const useTheme = () =>
  useAppStore((state) => state.ui.theme);

export const useLoadingState = (key: string) =>
  useAppStore((state) => state.ui.loading_states[key] || false);

export const useErrorState = (key: string) =>
  useAppStore((state) => state.ui.error_states[key] || null);

export const useHasAnyErrors = () =>
  useAppStore((state) => Object.keys(state.ui.error_states).length > 0);

export const useAllLoadingStates = () =>
  useAppStore((state) => state.ui.loading_states);

export const useAllErrorStates = () =>
  useAppStore((state) => state.ui.error_states);

export const useIsLoading = () =>
  useAppStore((state) => Object.keys(state.ui.loading_states).length > 0);

// ============================================================================
// Computed Selectors
// ============================================================================

export const useCurrentSessionStatus = () =>
  useAppStore((state) => {
    const sessionId = state.session.current_session_id;
    return sessionId ? state.session.sessions[sessionId]?.status : undefined;
  });

export const useCanStartNewResearch = () =>
  useAppStore((state) => {
    const isConnected = state.session.connection_status === "connected";
    const currentSession = state.session.current_session_id
      ? state.session.sessions[state.session.current_session_id]
      : undefined;
    const isSessionActive = currentSession?.status === "researching" ||
      currentSession?.status === "planning" ||
      currentSession?.status === "writing";
    
    return isConnected && !isSessionActive;
  });

export const useRecentMessages = (limit: number = 10) =>
  useAppStore((state) => {
    const messages = state.chat.messages;
    return messages.slice(-limit);
  });

export const useMessageCount = () =>
  useAppStore((state) => state.chat.messages.length);

export const useSessionCount = () =>
  useAppStore((state) => Object.keys(state.session.sessions).length);

// ============================================================================
// Action Selectors (for accessing actions)
// ============================================================================

export const useSessionActions = () =>
  useAppStore((state) => ({
    setCurrentSession: state.setCurrentSession,
    addSession: state.addSession,
    updateSession: state.updateSession,
    removeSession: state.removeSession,
    setCurrentPlan: state.setCurrentPlan,
    setCurrentReport: state.setCurrentReport,
    setConnectionStatus: state.setConnectionStatus,
    clearCurrentSession: state.clearCurrentSession,
  }));

export const useChatActions = () =>
  useAppStore((state) => ({
    addMessage: state.addMessage,
    updateMessage: state.updateMessage,
    removeMessage: state.removeMessage,
    clearMessages: state.clearMessages,
    setIsTyping: state.setIsTyping,
    setInputValue: state.setInputValue,
    setAwaitingUserInput: state.setAwaitingUserInput,
    handleWebSocketMessage: state.handleWebSocketMessage,
  }));

export const useUIActions = () =>
  useAppStore((state) => ({
    setSidebarCollapsed: state.setSidebarCollapsed,
    setActiveTab: state.setActiveTab,
    setTheme: state.setTheme,
    setLoadingState: state.setLoadingState,
    setErrorState: state.setErrorState,
    clearErrorStates: state.clearErrorStates,
  }));

// ============================================================================
// Utility Selectors
// ============================================================================

export const useAppState = () => useAppStore((state) => state);

export const useStoreActions = () =>
  useAppStore((state) => ({
    ...useSessionActions(),
    ...useChatActions(),
    ...useUIActions(),
  }));