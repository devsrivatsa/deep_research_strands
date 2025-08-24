import { assertEquals, assertRejects, assert } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { retry, withRetry, retryConfigs, RetryError, CircuitBreaker } from "./retry.ts";

Deno.test("retry - succeeds on first attempt", async () => {
  let callCount = 0;
  const fn = async () => {
    callCount++;
    return "success";
  };
  
  const result = await retry(fn);
  
  assertEquals(result, "success");
  assertEquals(callCount, 1);
});

Deno.test("retry - retries on failure and eventually succeeds", async () => {
  let callCount = 0;
  const fn = async () => {
    callCount++;
    if (callCount < 3) {
      throw new Error(`Failure ${callCount}`);
    }
    return "success";
  };
  
  const result = await retry(fn, { maxAttempts: 3, baseDelay: 10 });
  
  assertEquals(result, "success");
  assertEquals(callCount, 3);
});

Deno.test("retry - throws RetryError after max attempts", async () => {
  let callCount = 0;
  const fn = async () => {
    callCount++;
    throw new Error("Persistent failure");
  };
  
  await assertRejects(
    () => retry(fn, { maxAttempts: 2, baseDelay: 10 }),
    RetryError
  );
  assertEquals(callCount, 2);
});

Deno.test("retry - respects shouldRetry function", async () => {
  let callCount = 0;
  const fn = async () => {
    callCount++;
    throw new Error("Don't retry this");
  };
  
  const shouldRetry = () => false;
  
  await assertRejects(
    () => retry(fn, { shouldRetry }),
    Error,
    "Don't retry this"
  );
  assertEquals(callCount, 1);
});

Deno.test("retry - calls onRetry callback", async () => {
  let callCount = 0;
  let retryCallCount = 0;
  
  const fn = async () => {
    callCount++;
    if (callCount === 1) {
      throw new Error("Retry me");
    }
    return "success";
  };
  
  const onRetry = () => {
    retryCallCount++;
  };
  
  const result = await retry(fn, { onRetry, baseDelay: 10 });
  
  assertEquals(result, "success");
  assertEquals(retryCallCount, 1);
});

Deno.test("retryConfigs - api config has correct defaults", () => {
  assertEquals(retryConfigs.api.maxAttempts, 3);
  assertEquals(retryConfigs.api.baseDelay, 1000);
  assertEquals(retryConfigs.api.maxDelay, 5000);
  assert(typeof retryConfigs.api.shouldRetry === "function");
});

Deno.test("retryConfigs - api shouldRetry works correctly", () => {
  const { shouldRetry } = retryConfigs.api;
  
  // Should retry network errors
  const networkError = new Error("Connection failed");
  networkError.name = "NetworkError";
  assertEquals(shouldRetry(networkError), true);
  assertEquals(shouldRetry(new Error("fetch failed")), true);
  
  // Should retry 5xx errors
  assertEquals(shouldRetry(new Error("500 Internal Server Error")), true);
  assertEquals(shouldRetry(new Error("502 Bad Gateway")), true);
  assertEquals(shouldRetry(new Error("503 Service Unavailable")), true);
  assertEquals(shouldRetry(new Error("504 Gateway Timeout")), true);
  
  // Should not retry other errors
  assertEquals(shouldRetry(new Error("400 Bad Request")), false);
  assertEquals(shouldRetry(new Error("404 Not Found")), false);
  assertEquals(shouldRetry(new Error("Some other error")), false);
});

Deno.test("retryConfigs - websocket shouldRetry works correctly", () => {
  const { shouldRetry } = retryConfigs.websocket;
  
  // Should not retry auth errors
  assertEquals(shouldRetry(new Error("401 Unauthorized")), false);
  assertEquals(shouldRetry(new Error("403 Forbidden")), false);
  
  // Should retry other errors
  assertEquals(shouldRetry(new Error("500 Internal Server Error")), true);
  assertEquals(shouldRetry(new Error("Connection failed")), true);
});

Deno.test("CircuitBreaker - starts in closed state", () => {
  const circuitBreaker = new CircuitBreaker(2, 1000);
  assertEquals(circuitBreaker.getState().state, "closed");
});

Deno.test("CircuitBreaker - executes function successfully when closed", async () => {
  const circuitBreaker = new CircuitBreaker(2, 1000);
  const fn = async () => "success";
  
  const result = await circuitBreaker.execute(fn);
  
  assertEquals(result, "success");
  assertEquals(circuitBreaker.getState().state, "closed");
});

Deno.test("CircuitBreaker - opens circuit after failure threshold", async () => {
  const circuitBreaker = new CircuitBreaker(2, 1000);
  const fn = async () => {
    throw new Error("Failure");
  };
  
  // First failure
  await assertRejects(() => circuitBreaker.execute(fn), Error, "Failure");
  assertEquals(circuitBreaker.getState().state, "closed");
  
  // Second failure - should open circuit
  await assertRejects(() => circuitBreaker.execute(fn), Error, "Failure");
  assertEquals(circuitBreaker.getState().state, "open");
});

Deno.test("CircuitBreaker - can be manually reset", async () => {
  const circuitBreaker = new CircuitBreaker(2, 1000);
  const fn = async () => {
    throw new Error("Failure");
  };
  
  // Open the circuit
  await assertRejects(() => circuitBreaker.execute(fn));
  await assertRejects(() => circuitBreaker.execute(fn));
  assertEquals(circuitBreaker.getState().state, "open");
  
  // Reset manually
  circuitBreaker.reset();
  assertEquals(circuitBreaker.getState().state, "closed");
  assertEquals(circuitBreaker.getState().failures, 0);
});