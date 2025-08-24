import type {
  APIResponse,
  APIError,
  PaginatedResponse,
  CreateResearchSessionRequest,
  ResearchSessionResponse,
  SubmitPlanFeedbackRequest,
  ExportReportRequest,
  ExportReportResponse,
  Project,
  CreateProjectRequest,
  ResearchPlan,
} from "../types/index.ts";
import { retry, retryConfigs, CircuitBreaker } from "./retry.ts";

// ============================================================================
// Configuration and Types
// ============================================================================

export interface APIClientConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  cacheEnabled: boolean;
  cacheTTL: number;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retryAttempts?: number;
  skipCache?: boolean;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

// ============================================================================
// API Client Implementation
// ============================================================================

export class APIClient {
  private config: APIClientConfig;
  private cache: Map<string, CacheEntry> = new Map();
  private requestInterceptors: Array<(options: RequestOptions) => RequestOptions> = [];
  private responseInterceptors: Array<(response: APIResponse) => APIResponse> = [];

  constructor(config: Partial<APIClientConfig> = {}) {
    this.config = {
      baseURL: config.baseURL || "http://localhost:8000/api",
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
      cacheEnabled: config.cacheEnabled ?? true,
      cacheTTL: config.cacheTTL || 300000, // 5 minutes
    };

    // Add default request interceptors
    this.addRequestInterceptor((options) => ({
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    }));

    // Add default response interceptor for error handling
    this.addResponseInterceptor((response) => {
      if (!response.success && response.error) {
        console.error("API Error:", response.error);
      }
      return response;
    });
  }

  // ============================================================================
  // Interceptor Management
  // ============================================================================

  addRequestInterceptor(interceptor: (options: RequestOptions) => RequestOptions): void {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: (response: APIResponse) => APIResponse): void {
    this.responseInterceptors.push(interceptor);
  }

  // ============================================================================
  // Cache Management
  // ============================================================================

  private getCacheKey(url: string, options: RequestOptions): string {
    const method = options.method || "GET";
    const body = options.body ? JSON.stringify(options.body) : "";
    return `${method}:${url}:${body}`;
  }

  private getFromCache(key: string): any | null {
    if (!this.config.cacheEnabled) return null;

    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private setCache(key: string, data: any, ttl?: number): void {
    if (!this.config.cacheEnabled) return;

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.cacheTTL,
    });
  }

  clearCache(): void {
    this.cache.clear();
  }

  // ============================================================================
  // Core HTTP Methods
  // ============================================================================

  private async makeRequest<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<APIResponse<T>> {
    const url = `${this.config.baseURL}${endpoint}`;
    const cacheKey = this.getCacheKey(url, options);

    // Check cache for GET requests
    if ((options.method || "GET") === "GET" && !options.skipCache) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Apply request interceptors
    let processedOptions = { ...options };
    for (const interceptor of this.requestInterceptors) {
      processedOptions = interceptor(processedOptions);
    }

    const retryAttempts = processedOptions.retryAttempts ?? this.config.retryAttempts;
    const timeout = processedOptions.timeout ?? this.config.timeout;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
          const fetchOptions: RequestInit = {
            method: processedOptions.method || "GET",
            headers: processedOptions.headers,
            signal: controller.signal,
          };

          if (processedOptions.body && processedOptions.method !== "GET") {
            fetchOptions.body = typeof processedOptions.body === "string"
              ? processedOptions.body
              : JSON.stringify(processedOptions.body);
          }

          const response = await fetch(url, fetchOptions);
          
          let responseData: APIResponse<T>;

          try {
            responseData = await response.json();
          } catch {
            // If JSON parsing fails, create a generic response
            responseData = {
              success: response.ok,
              data: undefined,
              error: response.ok ? undefined : {
                code: `HTTP_${response.status}`,
                message: response.statusText || "Unknown error",
              },
              timestamp: new Date().toISOString(),
            };
          }

          // Apply response interceptors
          let processedResponse = responseData;
          for (const interceptor of this.responseInterceptors) {
            processedResponse = interceptor(processedResponse);
          }

          // Cache successful GET responses
          if (response.ok && (options.method || "GET") === "GET" && !options.skipCache) {
            this.setCache(cacheKey, processedResponse);
          }

          return processedResponse;
        } catch (fetchError) {
          clearTimeout(timeoutId);
          throw fetchError;
        }
      } catch (error) {
        lastError = error as Error;

        // Don't retry on certain errors
        if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
          // Network error, continue retrying
        } else if (error instanceof Error && error.name === "AbortError") {
          // Timeout error, continue retrying
        } else {
          // Other errors, don't retry
          break;
        }

        // Wait before retrying (exponential backoff)
        if (attempt < retryAttempts) {
          const delay = this.config.retryDelay * Math.pow(2, attempt);
          await new Promise((resolve) => {
            const retryTimeoutId = setTimeout(resolve, delay);
            // Store timeout ID for potential cleanup if needed
            return retryTimeoutId;
          });
        }
      }
    }

    // If all retries failed, return error response
    const errorResponse: APIResponse<T> = {
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message: lastError?.message || "Network request failed",
        details: { originalError: lastError?.name },
      },
      timestamp: new Date().toISOString(),
    };

    return errorResponse;
  }

  // ============================================================================
  // Research Session Endpoints
  // ============================================================================

  async createResearchSession(
    request: CreateResearchSessionRequest
  ): Promise<APIResponse<ResearchSessionResponse>> {
    return this.makeRequest<ResearchSessionResponse>("/sessions", {
      method: "POST",
      body: request,
    });
  }

  async getResearchSession(sessionId: string): Promise<APIResponse<ResearchSessionResponse>> {
    return this.makeRequest<ResearchSessionResponse>(`/sessions/${sessionId}`);
  }

  async listResearchSessions(
    page = 1,
    perPage = 20
  ): Promise<PaginatedResponse<ResearchSessionResponse>> {
    return this.makeRequest<ResearchSessionResponse[]>(
      `/sessions?page=${page}&per_page=${perPage}`
    ) as Promise<PaginatedResponse<ResearchSessionResponse>>;
  }

  async deleteResearchSession(sessionId: string): Promise<APIResponse<void>> {
    return this.makeRequest<void>(`/sessions/${sessionId}`, {
      method: "DELETE",
    });
  }

  async updateResearchSession(
    sessionId: string,
    updates: Partial<CreateResearchSessionRequest>
  ): Promise<APIResponse<ResearchSessionResponse>> {
    return this.makeRequest<ResearchSessionResponse>(`/sessions/${sessionId}`, {
      method: "PATCH",
      body: updates,
    });
  }

  // ============================================================================
  // Research Plan Endpoints
  // ============================================================================

  async getResearchPlan(sessionId: string): Promise<APIResponse<ResearchPlan>> {
    return this.makeRequest<ResearchPlan>(`/sessions/${sessionId}/plan`);
  }

  async submitPlanFeedback(
    request: SubmitPlanFeedbackRequest
  ): Promise<APIResponse<ResearchPlan>> {
    return this.makeRequest<ResearchPlan>(`/sessions/${request.session_id}/plan/feedback`, {
      method: "POST",
      body: { feedback: request.feedback },
    });
  }

  async approvePlan(sessionId: string): Promise<APIResponse<void>> {
    return this.makeRequest<void>(`/sessions/${sessionId}/plan/approve`, {
      method: "POST",
    });
  }

  async regeneratePlan(sessionId: string): Promise<APIResponse<ResearchPlan>> {
    return this.makeRequest<ResearchPlan>(`/sessions/${sessionId}/plan/regenerate`, {
      method: "POST",
    });
  }

  // ============================================================================
  // Report Endpoints
  // ============================================================================

  async getReport(sessionId: string): Promise<APIResponse<string>> {
    return this.makeRequest<string>(`/sessions/${sessionId}/report`);
  }

  async exportReport(request: ExportReportRequest): Promise<APIResponse<ExportReportResponse>> {
    return this.makeRequest<ExportReportResponse>(`/sessions/${request.session_id}/export`, {
      method: "POST",
      body: {
        format: request.format,
        options: request.options,
      },
    });
  }

  async getReportStatus(sessionId: string): Promise<APIResponse<{ status: string; progress: number }>> {
    return this.makeRequest<{ status: string; progress: number }>(`/sessions/${sessionId}/status`);
  }

  // ============================================================================
  // Project Management Endpoints
  // ============================================================================

  async createProject(request: CreateProjectRequest): Promise<APIResponse<Project>> {
    return this.makeRequest<Project>("/projects", {
      method: "POST",
      body: request,
    });
  }

  async getProject(projectId: string): Promise<APIResponse<Project>> {
    return this.makeRequest<Project>(`/projects/${projectId}`);
  }

  async listProjects(
    page = 1,
    perPage = 20,
    status?: Project["status"]
  ): Promise<PaginatedResponse<Project>> {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
    });

    if (status) {
      params.append("status", status);
    }

    return this.makeRequest<Project[]>(`/projects?${params.toString()}`) as Promise<
      PaginatedResponse<Project>
    >;
  }

  async updateProject(
    projectId: string,
    updates: Partial<CreateProjectRequest>
  ): Promise<APIResponse<Project>> {
    return this.makeRequest<Project>(`/projects/${projectId}`, {
      method: "PATCH",
      body: updates,
    });
  }

  async deleteProject(projectId: string): Promise<APIResponse<void>> {
    return this.makeRequest<void>(`/projects/${projectId}`, {
      method: "DELETE",
    });
  }

  async archiveProject(projectId: string): Promise<APIResponse<Project>> {
    return this.makeRequest<Project>(`/projects/${projectId}/archive`, {
      method: "POST",
    });
  }

  // ============================================================================
  // Search and Query Endpoints
  // ============================================================================

  async searchDocuments(
    query: string,
    sessionId?: string
  ): Promise<APIResponse<{ results: string[]; sources: string[] }>> {
    return this.makeRequest<{ results: string[]; sources: string[] }>("/search", {
      method: "POST",
      body: { query, session_id: sessionId },
    });
  }

  async getQueryComponents(query: string): Promise<APIResponse<any>> {
    return this.makeRequest<any>("/query/components", {
      method: "POST",
      body: { query },
    });
  }

  // ============================================================================
  // Health and Status Endpoints
  // ============================================================================

  async getHealth(): Promise<APIResponse<{ status: string; version: string; timestamp: string }>> {
    return this.makeRequest<{ status: string; version: string; timestamp: string }>("/health");
  }

  async getMetrics(): Promise<APIResponse<Record<string, any>>> {
    return this.makeRequest<Record<string, any>>("/metrics");
  }
}

// ============================================================================
// Default Export and Singleton Instance
// ============================================================================

// Create a default instance
export const apiClient = new APIClient();

// Export the class as default
export default APIClient;