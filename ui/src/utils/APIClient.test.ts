// Tests for APIClient implementation
import { assertEquals, assertExists, assert, assertRejects } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { beforeEach, describe, it, afterEach } from "https://deno.land/std@0.208.0/testing/bdd.ts";
import { stub, restore, Stub } from "https://deno.land/std@0.208.0/testing/mock.ts";

import { APIClient } from "./APIClient.ts";
import type {
  APIResponse,
  CreateResearchSessionRequest,
  ResearchSessionResponse,
  SubmitPlanFeedbackRequest,
} from "../types/index.ts";

// Mock fetch function
let fetchStub: Stub<typeof globalThis, Parameters<typeof fetch>, ReturnType<typeof fetch>>;

describe("APIClient", () => {
  let client: APIClient;

  beforeEach(() => {
    client = new APIClient({
      baseURL: "http://localhost:8000/api",
      timeout: 5000,
      retryAttempts: 2,
      retryDelay: 100,
      cacheEnabled: true,
      cacheTTL: 1000,
    });
  });

  afterEach(() => {
    restore();
  });

  describe("Configuration", () => {
    it("should initialize with default configuration", () => {
      const defaultClient = new APIClient();
      assertExists(defaultClient);
    });

    it("should initialize with custom configuration", () => {
      const customClient = new APIClient({
        baseURL: "http://custom.api.com",
        timeout: 10000,
        retryAttempts: 5,
      });
      assertExists(customClient);
    });
  });

  describe("Cache Management", () => {
    it("should cache GET requests", async () => {
      const mockResponse: APIResponse<{ test: string }> = {
        success: true,
        data: { test: "cached" },
        timestamp: new Date().toISOString(),
      };

      fetchStub = stub(globalThis, "fetch", () =>
        Promise.resolve(new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }))
      );

      // First request
      const result1 = await client.getHealth();
      assertEquals(fetchStub.calls.length, 1);

      // Second request should use cache
      const result2 = await client.getHealth();
      assertEquals(fetchStub.calls.length, 1); // Still 1, used cache

      assertEquals(result1.success, true);
      assertEquals(result2.success, true);
    });

    it("should clear cache", async () => {
      const mockResponse: APIResponse<any> = {
        success: true,
        data: { test: "data" },
        timestamp: new Date().toISOString(),
      };

      fetchStub = stub(globalThis, "fetch", () =>
        Promise.resolve(new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }))
      );

      // Make request to populate cache
      await client.getHealth();
      assertEquals(fetchStub.calls.length, 1);

      // Clear cache
      client.clearCache();

      // Next request should not use cache
      await client.getHealth();
      assertEquals(fetchStub.calls.length, 2);
    });
  });

  describe("Request Interceptors", () => {
    it("should apply request interceptors", async () => {
      let interceptorCalled = false;
      client.addRequestInterceptor((options) => {
        interceptorCalled = true;
        return {
          ...options,
          headers: {
            ...options.headers,
            "X-Custom-Header": "test-value",
          },
        };
      });

      fetchStub = stub(globalThis, "fetch", (input, init) => {
        const headers = init?.headers as Record<string, string>;
        assertEquals(headers["X-Custom-Header"], "test-value");
        return Promise.resolve(new Response(JSON.stringify({
          success: true,
          timestamp: new Date().toISOString(),
        }), { status: 200 }));
      });

      await client.getHealth();
      assert(interceptorCalled);
    });
  });

  describe("Response Interceptors", () => {
    it("should apply response interceptors", async () => {
      let interceptorCalled = false;
      client.addResponseInterceptor((response) => {
        interceptorCalled = true;
        return {
          ...response,
          data: { ...response.data, intercepted: true },
        };
      });

      fetchStub = stub(globalThis, "fetch", () =>
        Promise.resolve(new Response(JSON.stringify({
          success: true,
          data: { original: true },
          timestamp: new Date().toISOString(),
        }), { status: 200 }))
      );

      const result = await client.getHealth();
      assert(interceptorCalled);
      assertEquals((result.data as any).intercepted, true);
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors", async () => {
      fetchStub = stub(globalThis, "fetch", () =>
        Promise.reject(new TypeError("Failed to fetch"))
      );

      const result = await client.getHealth();
      assertEquals(result.success, false);
      assertEquals(result.error?.code, "NETWORK_ERROR");
      assertExists(result.error?.message);
    });

    it("should handle timeout errors", async () => {
      fetchStub = stub(globalThis, "fetch", () =>
        new Promise((_, reject) => {
          setTimeout(() => reject(new DOMException("Aborted", "AbortError")), 100);
        })
      );

      const result = await client.getHealth();
      assertEquals(result.success, false);
      assertEquals(result.error?.code, "NETWORK_ERROR");
    });

    it("should handle HTTP error responses", async () => {
      const errorResponse: APIResponse<any> = {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Resource not found",
        },
        timestamp: new Date().toISOString(),
      };

      fetchStub = stub(globalThis, "fetch", () =>
        Promise.resolve(new Response(JSON.stringify(errorResponse), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }))
      );

      const result = await client.getResearchSession("nonexistent");
      assertEquals(result.success, false);
      assertEquals(result.error?.code, "NOT_FOUND");
    });

    it("should handle malformed JSON responses", async () => {
      fetchStub = stub(globalThis, "fetch", () =>
        Promise.resolve(new Response("Invalid JSON", {
          status: 500,
          statusText: "Internal Server Error",
        }))
      );

      const result = await client.getHealth();
      assertEquals(result.success, false);
      assertEquals(result.error?.code, "HTTP_500");
      assertEquals(result.error?.message, "Internal Server Error");
    });
  });

  describe("Retry Mechanism", () => {
    it("should retry failed requests", async () => {
      let callCount = 0;
      fetchStub = stub(globalThis, "fetch", () => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new TypeError("Failed to fetch"));
        }
        return Promise.resolve(new Response(JSON.stringify({
          success: true,
          data: { test: "success" },
          timestamp: new Date().toISOString(),
        }), { status: 200 }));
      });

      const result = await client.getHealth();
      assertEquals(callCount, 3);
      assertEquals(result.success, true);
    });

    it("should respect retry limit", async () => {
      fetchStub = stub(globalThis, "fetch", () =>
        Promise.reject(new TypeError("Failed to fetch"))
      );

      const result = await client.getHealth();
      assertEquals(fetchStub.calls.length, 3); // Initial + 2 retries
      assertEquals(result.success, false);
    });
  });

  describe("Research Session Endpoints", () => {
    it("should create research session", async () => {
      const request: CreateResearchSessionRequest = {
        topic: "Test Research Topic",
        configuration: {
          number_of_queries: 5,
        },
      };

      const mockResponse: APIResponse<ResearchSessionResponse> = {
        success: true,
        data: {
          session_id: "test-session-123",
          topic: request.topic,
          status: "created",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          configuration: request.configuration,
        },
        timestamp: new Date().toISOString(),
      };

      fetchStub = stub(globalThis, "fetch", (input, init) => {
        assertEquals(init?.method, "POST");
        const body = JSON.parse(init?.body as string);
        assertEquals(body.topic, request.topic);
        return Promise.resolve(new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }));
      });

      const result = await client.createResearchSession(request);
      assertEquals(result.success, true);
      assertEquals(result.data?.session_id, "test-session-123");
      assertEquals(result.data?.topic, request.topic);
    });

    it("should get research session", async () => {
      const sessionId = "test-session-123";
      const mockResponse: APIResponse<ResearchSessionResponse> = {
        success: true,
        data: {
          session_id: sessionId,
          topic: "Test Topic",
          status: "completed",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };

      fetchStub = stub(globalThis, "fetch", (input) => {
        assert((input as string).includes(sessionId));
        return Promise.resolve(new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }));
      });

      const result = await client.getResearchSession(sessionId);
      assertEquals(result.success, true);
      assertEquals(result.data?.session_id, sessionId);
    });

    it("should list research sessions with pagination", async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            session_id: "session-1",
            topic: "Topic 1",
            status: "completed",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        pagination: {
          page: 1,
          per_page: 20,
          total: 1,
          total_pages: 1,
          has_next: false,
          has_prev: false,
        },
        timestamp: new Date().toISOString(),
      };

      fetchStub = stub(globalThis, "fetch", (input) => {
        assert((input as string).includes("page=1"));
        assert((input as string).includes("per_page=20"));
        return Promise.resolve(new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }));
      });

      const result = await client.listResearchSessions(1, 20);
      assertEquals(result.success, true);
      assertEquals(result.data?.length, 1);
      assertEquals(result.pagination?.page, 1);
    });

    it("should delete research session", async () => {
      const sessionId = "test-session-123";
      const mockResponse: APIResponse<void> = {
        success: true,
        timestamp: new Date().toISOString(),
      };

      fetchStub = stub(globalThis, "fetch", (input, init) => {
        assert((input as string).includes(sessionId));
        assertEquals(init?.method, "DELETE");
        return Promise.resolve(new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }));
      });

      const result = await client.deleteResearchSession(sessionId);
      assertEquals(result.success, true);
    });
  });

  describe("Plan Feedback Endpoints", () => {
    it("should submit plan feedback", async () => {
      const request: SubmitPlanFeedbackRequest = {
        session_id: "test-session-123",
        feedback: "This plan looks good",
      };

      const mockResponse: APIResponse<any> = {
        success: true,
        data: {
          sections: [
            {
              name: "Introduction",
              description: "Overview section",
              research: true,
              content: "",
            },
          ],
        },
        timestamp: new Date().toISOString(),
      };

      fetchStub = stub(globalThis, "fetch", (input, init) => {
        assert((input as string).includes(request.session_id));
        assert((input as string).includes("feedback"));
        assertEquals(init?.method, "POST");
        const body = JSON.parse(init?.body as string);
        assertEquals(body.feedback, request.feedback);
        return Promise.resolve(new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }));
      });

      const result = await client.submitPlanFeedback(request);
      assertEquals(result.success, true);
      assertExists(result.data?.sections);
    });

    it("should approve plan", async () => {
      const sessionId = "test-session-123";
      const mockResponse: APIResponse<void> = {
        success: true,
        timestamp: new Date().toISOString(),
      };

      fetchStub = stub(globalThis, "fetch", (input, init) => {
        assert((input as string).includes(sessionId));
        assert((input as string).includes("approve"));
        assertEquals(init?.method, "POST");
        return Promise.resolve(new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }));
      });

      const result = await client.approvePlan(sessionId);
      assertEquals(result.success, true);
    });
  });

  describe("Report Endpoints", () => {
    it("should get report", async () => {
      const sessionId = "test-session-123";
      const mockResponse: APIResponse<string> = {
        success: true,
        data: "# Research Report\n\nThis is the report content...",
        timestamp: new Date().toISOString(),
      };

      fetchStub = stub(globalThis, "fetch", (input) => {
        assert((input as string).includes(sessionId));
        assert((input as string).includes("report"));
        return Promise.resolve(new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }));
      });

      const result = await client.getReport(sessionId);
      assertEquals(result.success, true);
      assert(result.data?.includes("Research Report"));
    });

    it("should export report", async () => {
      const request = {
        session_id: "test-session-123",
        format: "pdf" as const,
        options: {
          include_metadata: true,
          include_sources: true,
        },
      };

      const mockResponse: APIResponse<any> = {
        success: true,
        data: {
          download_url: "https://example.com/download/report.pdf",
          expires_at: new Date(Date.now() + 3600000).toISOString(),
          format: "pdf",
          file_size: 1024000,
        },
        timestamp: new Date().toISOString(),
      };

      fetchStub = stub(globalThis, "fetch", (input, init) => {
        assert((input as string).includes(request.session_id));
        assert((input as string).includes("export"));
        assertEquals(init?.method, "POST");
        const body = JSON.parse(init?.body as string);
        assertEquals(body.format, request.format);
        return Promise.resolve(new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }));
      });

      const result = await client.exportReport(request);
      assertEquals(result.success, true);
      assertEquals(result.data?.format, "pdf");
      assertExists(result.data?.download_url);
    });
  });

  describe("Project Management Endpoints", () => {
    it("should create project", async () => {
      const request = {
        name: "Test Project",
        description: "A test project for research",
      };

      const mockResponse: APIResponse<any> = {
        success: true,
        data: {
          id: "project-123",
          name: request.name,
          description: request.description,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          sessions: [],
          status: "active",
        },
        timestamp: new Date().toISOString(),
      };

      fetchStub = stub(globalThis, "fetch", (input, init) => {
        assert((input as string).includes("projects"));
        assertEquals(init?.method, "POST");
        const body = JSON.parse(init?.body as string);
        assertEquals(body.name, request.name);
        return Promise.resolve(new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }));
      });

      const result = await client.createProject(request);
      assertEquals(result.success, true);
      assertEquals(result.data?.name, request.name);
    });

    it("should list projects with status filter", async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            id: "project-1",
            name: "Active Project",
            status: "active",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            sessions: [],
          },
        ],
        pagination: {
          page: 1,
          per_page: 20,
          total: 1,
          total_pages: 1,
          has_next: false,
          has_prev: false,
        },
        timestamp: new Date().toISOString(),
      };

      fetchStub = stub(globalThis, "fetch", (input) => {
        assert((input as string).includes("status=active"));
        return Promise.resolve(new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }));
      });

      const result = await client.listProjects(1, 20, "active");
      assertEquals(result.success, true);
      assertEquals(result.data?.[0]?.status, "active");
    });
  });

  describe("Search Endpoints", () => {
    it("should search documents", async () => {
      const query = "test search query";
      const sessionId = "test-session-123";

      const mockResponse: APIResponse<any> = {
        success: true,
        data: {
          results: ["Result 1", "Result 2"],
          sources: ["Source 1", "Source 2"],
        },
        timestamp: new Date().toISOString(),
      };

      fetchStub = stub(globalThis, "fetch", (input, init) => {
        assert((input as string).includes("search"));
        assertEquals(init?.method, "POST");
        const body = JSON.parse(init?.body as string);
        assertEquals(body.query, query);
        assertEquals(body.session_id, sessionId);
        return Promise.resolve(new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }));
      });

      const result = await client.searchDocuments(query, sessionId);
      assertEquals(result.success, true);
      assertEquals(result.data?.results.length, 2);
    });
  });

  describe("Health Endpoints", () => {
    it("should get health status", async () => {
      const mockResponse: APIResponse<any> = {
        success: true,
        data: {
          status: "healthy",
          version: "1.0.0",
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };

      fetchStub = stub(globalThis, "fetch", (input) => {
        assert((input as string).includes("health"));
        return Promise.resolve(new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }));
      });

      const result = await client.getHealth();
      assertEquals(result.success, true);
      assertEquals(result.data?.status, "healthy");
    });

    it("should get metrics", async () => {
      const mockResponse: APIResponse<Record<string, any>> = {
        success: true,
        data: {
          requests_total: 100,
          response_time_avg: 250,
          active_sessions: 5,
        },
        timestamp: new Date().toISOString(),
      };

      fetchStub = stub(globalThis, "fetch", (input) => {
        assert((input as string).includes("metrics"));
        return Promise.resolve(new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }));
      });

      const result = await client.getMetrics();
      assertEquals(result.success, true);
      assertEquals(result.data?.requests_total, 100);
    });
  });
});