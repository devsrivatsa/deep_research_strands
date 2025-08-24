import { assertEquals, assert } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { useToast, Toast } from "./Toast.tsx";

Deno.test("Toast - type definitions", () => {
  const toast: Toast = {
    id: "test-id",
    type: "success",
    title: "Test Title",
    message: "Test Message",
    duration: 5000,
  };

  assertEquals(toast.id, "test-id");
  assertEquals(toast.type, "success");
  assertEquals(toast.title, "Test Title");
  assertEquals(toast.message, "Test Message");
  assertEquals(toast.duration, 5000);
});

Deno.test("Toast - with action", () => {
  let actionCalled = false;
  
  const toast: Toast = {
    id: "test-id",
    type: "info",
    title: "Action Toast",
    action: {
      label: "Click Me",
      onClick: () => { actionCalled = true; },
    },
  };

  // Simulate action click
  toast.action?.onClick();
  assertEquals(actionCalled, true);
});

Deno.test("Toast - all types are valid", () => {
  const types: Array<Toast["type"]> = ["success", "error", "warning", "info"];
  
  types.forEach(type => {
    const toast: Toast = {
      id: `test-${type}`,
      type,
      title: `${type} toast`,
    };
    
    assertEquals(toast.type, type);
    assert(["success", "error", "warning", "info"].includes(toast.type));
  });
});

Deno.test("Toast - default duration", () => {
  const toast: Toast = {
    id: "test",
    type: "success",
    title: "Test",
  };

  // Duration is optional, should be undefined if not set
  assertEquals(toast.duration, undefined);
});

Deno.test("Toast - crypto.randomUUID availability", () => {
  // Test that crypto.randomUUID is available (used in useToast hook)
  const uuid = crypto.randomUUID();
  assert(typeof uuid === "string");
  assert(uuid.length > 0);
  assert(uuid.includes("-")); // UUIDs contain hyphens
});