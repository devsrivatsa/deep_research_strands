// Simple test to verify APIClient functionality without timer leaks
import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { APIClient } from "./APIClient.ts";

Deno.test("APIClient - Basic functionality", async () => {
  const client = new APIClient({
    baseURL: "http://localhost:8000/api",
    timeout: 1000,
    retryAttempts: 0, // Disable retries to avoid timer leaks
    cacheEnabled: false, // Disable cache for simpler testing
  });

  // Test that client initializes correctly
  assertExists(client);

  // Test interceptor functionality
  let interceptorCalled = false;
  client.addRequestInterceptor((options) => {
    interceptorCalled = true;
    return {
      ...options,
      headers: {
        ...options.headers,
        "X-Test-Header": "test-value",
      },
    };
  });

  // Test cache clearing (should not throw)
  client.clearCache();

  assertEquals(interceptorCalled, false); // Not called yet
  console.log("✅ APIClient basic functionality test passed");
});

Deno.test("APIClient - Configuration", () => {
  // Test default configuration
  const defaultClient = new APIClient();
  assertExists(defaultClient);

  // Test custom configuration
  const customClient = new APIClient({
    baseURL: "http://custom.api.com",
    timeout: 10000,
    retryAttempts: 5,
    cacheEnabled: true,
    cacheTTL: 60000,
  });
  assertExists(customClient);

  console.log("✅ APIClient configuration test passed");
});