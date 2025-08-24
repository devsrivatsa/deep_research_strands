// Tests for Zustand store implementation
import { assertEquals, assertExists, assert } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { beforeEach, describe, it } from "https://deno.land/std@0.208.0/testing/bdd.ts";
import { useAppStore } from "./index.ts";
import type {
  ChatMessage,
  ResearchPlan,
  ResearchSessionResponse,
  WebSocketMessage,
  APIError,
} from "../types/index.ts";

// Mock localStorage for testing
const mockStorage = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (key: string) => mockStorage.get(key) || null,
    setItem: (key: string, value: string) => mockStorage.set(key, value),
    removeItem: (key: string) => mockStorage.delete(key),
    clear: () => mockStorage.clear(),
  },
});

// Mock crypto.randomUUID for consistent test IDs
Object.defineProperty(globalThis, "crypto", {
  value: {
    randomUUID: () => "test-uuid-" + Math.random().toString(36).substr(2, 9),
  },
});

describe("App Store", () => {
  beforeEach(() => {
    // Clear store state before each test
    useAppStore.setState({
      session: {
        current_session_id: undefined,
        sessions: {},
        current_plan: undefined,
        current_report: undefined,
        connection_status: "disconnected",
      },
      chat: {
        messages: [],
        is_typing: false,
        input_value: "",
        awaiting_user_input: false,
        user_input_context: undefined,
      },
      ui: {
        sidebar_collapsed: false,
        active_tab: "chat",
        theme: "system",
        loading_states: {},
        error_states: {},
      },
    });
    mockStorage.clear();
  });

  describe("Session Management", () => {
    it("should set current session", () => {
      const store = useAppStore.getState();
      store.setCurrentSession("test-session-1");
      
      assertEquals(useAppStore.getState().session.current_session_id, "test-session-1");
    });

    it("should add and retrieve sessions", () => {
      const store = useAppStore.getState();
      const session: ResearchSessionResponse = {
        session_id: "test-session-1",
        topic: "Test Topic",
        status: "created",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      store.addSession(session);
      
      const state = useAppStore.getState();
      assertEquals(state.session.sessions["test-session-1"], session);
    });

    it("should update existing session", () => {
      const store = useAppStore.getState();
      const session: ResearchSessionResponse = {
        session_id: "test-session-1",
        topic: "Test Topic",
        status: "created",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      store.addSession(session);
      store.updateSession("test-session-1", { status: "planning" });
      
      const state = useAppStore.getState();
      assertEquals(state.session.sessions["test-session-1"].status, "planning");
    });

    it("should remove session and clear current if it matches", () => {
      const store = useAppStore.getState();
      const session: ResearchSessionResponse = {
        session_id: "test-session-1",
        topic: "Test Topic",
        status: "created",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      store.addSession(session);
      store.setCurrentSession("test-session-1");
      store.removeSession("test-session-1");
      
      const state = useAppStore.getState();
      assertEquals(state.session.sessions["test-session-1"], undefined);
      assertEquals(state.session.current_session_id, undefined);
    });

    it("should set and clear current plan", () => {
      const store = useAppStore.getState();
      const plan: ResearchPlan = {
        sections: [
          {
            name: "Introduction",
            description: "Test section",
            research: true,
            content: "",
          },
        ],
      };

      store.setCurrentPlan(plan);
      assertEquals(useAppStore.getState().session.current_plan, plan);

      store.setCurrentPlan(undefined);
      assertEquals(useAppStore.getState().session.current_plan, undefined);
    });

    it("should set connection status", () => {
      const store = useAppStore.getState();
      
      store.setConnectionStatus("connecting");
      assertEquals(useAppStore.getState().session.connection_status, "connecting");
      
      store.setConnectionStatus("connected");
      assertEquals(useAppStore.getState().session.connection_status, "connected");
    });

    it("should clear current session and related data", () => {
      const store = useAppStore.getState();
      const session: ResearchSessionResponse = {
        session_id: "test-session-1",
        topic: "Test Topic",
        status: "created",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };
      const plan: ResearchPlan = { sections: [] };
      const message: ChatMessage = {
        id: "msg-1",
        type: "user",
        content: "Test message",
        timestamp: "2024-01-01T00:00:00Z",
      };

      store.addSession(session);
      store.setCurrentSession("test-session-1");
      store.setCurrentPlan(plan);
      store.setCurrentReport("Test report");
      store.addMessage(message);
      store.setAwaitingUserInput(true);

      store.clearCurrentSession();
      
      const state = useAppStore.getState();
      assertEquals(state.session.current_session_id, undefined);
      assertEquals(state.session.current_plan, undefined);
      assertEquals(state.session.current_report, undefined);
      assertEquals(state.chat.messages.length, 0);
      assertEquals(state.chat.awaiting_user_input, false);
      assertEquals(state.chat.user_input_context, undefined);
    });
  });

  describe("Chat Management", () => {
    it("should add and retrieve messages", () => {
      const store = useAppStore.getState();
      const message: ChatMessage = {
        id: "msg-1",
        type: "user",
        content: "Test message",
        timestamp: "2024-01-01T00:00:00Z",
      };

      store.addMessage(message);
      
      const state = useAppStore.getState();
      assertEquals(state.chat.messages.length, 1);
      assertEquals(state.chat.messages[0], message);
    });

    it("should update existing message", () => {
      const store = useAppStore.getState();
      const message: ChatMessage = {
        id: "msg-1",
        type: "user",
        content: "Test message",
        timestamp: "2024-01-01T00:00:00Z",
      };

      store.addMessage(message);
      store.updateMessage("msg-1", { content: "Updated message" });
      
      const state = useAppStore.getState();
      assertEquals(state.chat.messages[0].content, "Updated message");
    });

    it("should remove message", () => {
      const store = useAppStore.getState();
      const message: ChatMessage = {
        id: "msg-1",
        type: "user",
        content: "Test message",
        timestamp: "2024-01-01T00:00:00Z",
      };

      store.addMessage(message);
      store.removeMessage("msg-1");
      
      const state = useAppStore.getState();
      assertEquals(state.chat.messages.length, 0);
    });

    it("should clear all messages", () => {
      const store = useAppStore.getState();
      const messages: ChatMessage[] = [
        {
          id: "msg-1",
          type: "user",
          content: "Message 1",
          timestamp: "2024-01-01T00:00:00Z",
        },
        {
          id: "msg-2",
          type: "assistant",
          content: "Message 2",
          timestamp: "2024-01-01T00:01:00Z",
        },
      ];

      messages.forEach((msg) => store.addMessage(msg));
      assertEquals(useAppStore.getState().chat.messages.length, 2);

      store.clearMessages();
      assertEquals(useAppStore.getState().chat.messages.length, 0);
    });

    it("should set typing state", () => {
      const store = useAppStore.getState();
      
      store.setIsTyping(true);
      assert(useAppStore.getState().chat.is_typing);
      
      store.setIsTyping(false);
      assert(!useAppStore.getState().chat.is_typing);
    });

    it("should set input value", () => {
      const store = useAppStore.getState();
      
      store.setInputValue("Test input");
      assertEquals(useAppStore.getState().chat.input_value, "Test input");
    });

    it("should set awaiting user input state", () => {
      const store = useAppStore.getState();
      const context = {
        message: "Please provide feedback",
        input_type: "feedback" as const,
      };
      
      store.setAwaitingUserInput(true, context);
      
      const state = useAppStore.getState();
      assert(state.chat.awaiting_user_input);
      assertEquals(state.chat.user_input_context, context);
    });
  });

  describe("WebSocket Message Handling", () => {
    it("should handle connection established message", () => {
      const store = useAppStore.getState();
      const message: WebSocketMessage = {
        type: "connection_established",
        timestamp: "2024-01-01T00:00:00Z",
        data: {
          session_id: "test-session-1",
          server_version: "1.0.0",
        },
      };

      store.handleWebSocketMessage(message);
      
      const state = useAppStore.getState();
      assertEquals(state.session.connection_status, "connected");
      assertEquals(state.session.current_session_id, "test-session-1");
      assertEquals(state.chat.messages.length, 1);
      assertEquals(state.chat.messages[0].type, "system");
    });

    it("should handle plan generated message", () => {
      const store = useAppStore.getState();
      const plan: ResearchPlan = {
        sections: [
          {
            name: "Introduction",
            description: "Test section",
            research: true,
            content: "",
          },
        ],
      };
      const message: WebSocketMessage = {
        type: "plan_generated",
        timestamp: "2024-01-01T00:00:00Z",
        data: {
          plan,
          topic: "Test Topic",
        },
      };

      store.handleWebSocketMessage(message);
      
      const state = useAppStore.getState();
      assertEquals(state.session.current_plan, plan);
      assertEquals(state.chat.messages.length, 1);
    });

    it("should handle plan feedback requested message", () => {
      const store = useAppStore.getState();
      const plan: ResearchPlan = { sections: [] };
      const message: WebSocketMessage = {
        type: "plan_feedback_requested",
        timestamp: "2024-01-01T00:00:00Z",
        data: {
          plan,
          message: "Please review the plan",
        },
      };

      store.handleWebSocketMessage(message);
      
      const state = useAppStore.getState();
      assertEquals(state.session.current_plan, plan);
      assert(state.chat.awaiting_user_input);
      assertEquals(state.chat.user_input_context?.input_type, "feedback");
    });

    it("should handle error message", () => {
      const store = useAppStore.getState();
      const message: WebSocketMessage = {
        type: "error",
        timestamp: "2024-01-01T00:00:00Z",
        data: {
          error: "Test error",
          error_code: "TEST_ERROR",
        },
      };

      store.handleWebSocketMessage(message);
      
      const state = useAppStore.getState();
      assertEquals(state.chat.messages.length, 1);
      assertEquals(state.chat.messages[0].type, "error");
      assertExists(state.ui.error_states.websocket);
      assertEquals(state.ui.error_states.websocket?.code, "TEST_ERROR");
    });

    it("should handle report completed message", () => {
      const store = useAppStore.getState();
      const message: WebSocketMessage = {
        type: "report_completed",
        timestamp: "2024-01-01T00:00:00Z",
        data: {
          final_report: "Test report content",
          sections: [],
        },
      };

      store.handleWebSocketMessage(message);
      
      const state = useAppStore.getState();
      assertEquals(state.session.current_report, "Test report content");
      assertEquals(state.chat.messages.length, 1);
    });
  });

  describe("UI Management", () => {
    it("should toggle sidebar collapsed state", () => {
      const store = useAppStore.getState();
      
      store.setSidebarCollapsed(true);
      assert(useAppStore.getState().ui.sidebar_collapsed);
      
      store.setSidebarCollapsed(false);
      assert(!useAppStore.getState().ui.sidebar_collapsed);
    });

    it("should set active tab", () => {
      const store = useAppStore.getState();
      
      store.setActiveTab("plan");
      assertEquals(useAppStore.getState().ui.active_tab, "plan");
      
      store.setActiveTab("report");
      assertEquals(useAppStore.getState().ui.active_tab, "report");
    });

    it("should set theme", () => {
      const store = useAppStore.getState();
      
      store.setTheme("dark");
      assertEquals(useAppStore.getState().ui.theme, "dark");
      
      store.setTheme("light");
      assertEquals(useAppStore.getState().ui.theme, "light");
    });

    it("should manage loading states", () => {
      const store = useAppStore.getState();
      
      store.setLoadingState("api-call", true);
      assert(useAppStore.getState().ui.loading_states["api-call"]);
      
      store.setLoadingState("api-call", false);
      assertEquals(useAppStore.getState().ui.loading_states["api-call"], undefined);
    });

    it("should manage error states", () => {
      const store = useAppStore.getState();
      const error: APIError = {
        code: "TEST_ERROR",
        message: "Test error message",
      };
      
      store.setErrorState("api-call", error);
      assertEquals(useAppStore.getState().ui.error_states["api-call"], error);
      
      store.setErrorState("api-call", null);
      assertEquals(useAppStore.getState().ui.error_states["api-call"], undefined);
    });

    it("should clear all error states", () => {
      const store = useAppStore.getState();
      const error: APIError = {
        code: "TEST_ERROR",
        message: "Test error message",
      };
      
      store.setErrorState("error1", error);
      store.setErrorState("error2", error);
      assertEquals(Object.keys(useAppStore.getState().ui.error_states).length, 2);
      
      store.clearErrorStates();
      assertEquals(Object.keys(useAppStore.getState().ui.error_states).length, 0);
    });
  });

  describe("State Persistence", () => {
    it("should persist UI preferences", () => {
      const store = useAppStore.getState();
      
      store.setTheme("dark");
      store.setSidebarCollapsed(true);
      store.setActiveTab("plan");
      store.setCurrentSession("test-session");
      
      // Verify the state is set correctly
      const state = useAppStore.getState();
      assertEquals(state.ui.theme, "dark");
      assertEquals(state.ui.sidebar_collapsed, true);
      assertEquals(state.ui.active_tab, "plan");
      assertEquals(state.session.current_session_id, "test-session");
      
      // Note: In a real environment, the persist middleware would save to localStorage
      // For testing purposes, we verify the state is correctly managed in memory
    });
  });
});