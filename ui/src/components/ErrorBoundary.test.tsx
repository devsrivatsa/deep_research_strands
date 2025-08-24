import { assertEquals, assertThrows } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { ErrorBoundary } from "./ErrorBoundary.tsx";

Deno.test("ErrorBoundary - basic functionality", () => {
  // Test that ErrorBoundary class exists and can be instantiated
  const errorBoundary = new ErrorBoundary({ children: null });
  assertEquals(typeof errorBoundary, "object");
  assertEquals(errorBoundary.state.hasError, false);
});

Deno.test("ErrorBoundary - getDerivedStateFromError", () => {
  const error = new Error("Test error");
  const newState = ErrorBoundary.getDerivedStateFromError(error);
  
  assertEquals(newState.hasError, true);
  assertEquals(newState.error, error);
});

Deno.test("ErrorBoundary - componentDidCatch method exists", () => {
  const errorBoundary = new ErrorBoundary({ children: null });
  const error = new Error("Test error");
  const errorInfo = { componentStack: "test stack" };
  
  // Mock console.error to avoid noise in tests
  const originalError = console.error;
  console.error = () => {};
  
  try {
    // Just verify the method can be called without throwing
    errorBoundary.componentDidCatch(error, errorInfo);
    assertEquals(typeof errorBoundary.componentDidCatch, "function");
  } finally {
    console.error = originalError;
  }
});

Deno.test("ErrorBoundary - onError callback", () => {
  let callbackCalled = false;
  let callbackError: Error | null = null;
  
  const onError = (error: Error) => {
    callbackCalled = true;
    callbackError = error;
  };
  
  const errorBoundary = new ErrorBoundary({ 
    children: null, 
    onError 
  });
  
  const testError = new Error("Callback test");
  const errorInfo = { componentStack: "test" };
  
  // Mock console.error
  const originalError = console.error;
  console.error = () => {};
  
  try {
    errorBoundary.componentDidCatch(testError, errorInfo);
    assertEquals(callbackCalled, true);
    assertEquals(callbackError, testError);
  } finally {
    console.error = originalError;
  }
});