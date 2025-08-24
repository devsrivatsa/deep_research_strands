export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  shouldRetry?: (error: Error, attempt: number) => boolean;
  onRetry?: (error: Error, attempt: number) => void;
}

export class RetryError extends Error {
  constructor(
    message: string,
    public readonly lastError: Error,
    public readonly attempts: number
  ) {
    super(message);
    this.name = "RetryError";
  }
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    shouldRetry = (error: Error) => true,
    onRetry,
  } = options;

  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on the last attempt
      if (attempt === maxAttempts) {
        break;
      }
      
      // Check if we should retry this error
      if (!shouldRetry(lastError, attempt)) {
        throw lastError;
      }
      
      // Call retry callback
      onRetry?.(lastError, attempt);
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        baseDelay * Math.pow(backoffFactor, attempt - 1),
        maxDelay
      );
      
      // Add jitter to prevent thundering herd
      const jitteredDelay = delay * (0.5 + Math.random() * 0.5);
      
      await new Promise(resolve => setTimeout(resolve, jitteredDelay));
    }
  }
  
  throw new RetryError(
    `Failed after ${maxAttempts} attempts`,
    lastError!,
    maxAttempts
  );
}

/**
 * Create a retryable version of a function
 */
export function withRetry<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  options: RetryOptions = {}
) {
  return (...args: T): Promise<R> => {
    return retry(() => fn(...args), options);
  };
}

/**
 * Common retry configurations
 */
export const retryConfigs = {
  // For API calls
  api: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 5000,
    shouldRetry: (error: Error) => {
      // Retry on network errors and 5xx status codes
      if (error.name === "NetworkError" || error.message.includes("fetch")) {
        return true;
      }
      if (error.message.includes("500") || error.message.includes("502") || 
          error.message.includes("503") || error.message.includes("504")) {
        return true;
      }
      return false;
    },
  },
  
  // For WebSocket connections
  websocket: {
    maxAttempts: 5,
    baseDelay: 2000,
    maxDelay: 30000,
    backoffFactor: 1.5,
    shouldRetry: (error: Error) => {
      // Don't retry on authentication errors
      if (error.message.includes("401") || error.message.includes("403")) {
        return false;
      }
      return true;
    },
  },
  
  // For file operations
  file: {
    maxAttempts: 2,
    baseDelay: 500,
    maxDelay: 2000,
    shouldRetry: (error: Error) => {
      // Retry on temporary file system errors
      return error.message.includes("EBUSY") || 
             error.message.includes("EAGAIN") ||
             error.message.includes("EMFILE");
    },
  },
  
  // Quick retry for transient errors
  quick: {
    maxAttempts: 2,
    baseDelay: 100,
    maxDelay: 500,
  },
} as const;

/**
 * Retry with circuit breaker pattern
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: "closed" | "open" | "half-open" = "closed";
  
  constructor(
    private readonly failureThreshold = 5,
    private readonly recoveryTimeout = 60000
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = "half-open";
      } else {
        throw new Error("Circuit breaker is open");
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failures = 0;
    this.state = "closed";
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = "open";
    }
  }
  
  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
    };
  }
  
  reset() {
    this.failures = 0;
    this.lastFailureTime = 0;
    this.state = "closed";
  }
}