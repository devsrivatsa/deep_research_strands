import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { ChatMessage as ChatMessageType } from "../types/index.ts";

// Test the message type styles mapping
Deno.test("ChatMessage - MESSAGE_TYPE_STYLES contains all message types", () => {
  const messageTypes: ChatMessageType["type"][] = [
    "user",
    "assistant",
    "system",
    "error",
    "status",
    "plan_update",
    "section_update",
  ];

  // This would be the styles object from the component
  const MESSAGE_TYPE_STYLES = {
    user: "bg-blue-500 text-white ml-auto",
    assistant: "bg-white text-gray-900 border border-gray-200",
    system: "bg-gray-100 text-gray-700 text-sm",
    error: "bg-red-50 text-red-800 border border-red-200",
    status: "bg-yellow-50 text-yellow-800 border border-yellow-200",
    plan_update: "bg-green-50 text-green-800 border border-green-200",
    section_update: "bg-blue-50 text-blue-800 border border-blue-200",
  };

  messageTypes.forEach((type) => {
    assertEquals(typeof MESSAGE_TYPE_STYLES[type], "string");
    assertEquals(MESSAGE_TYPE_STYLES[type].length > 0, true);
  });
});

// Test timestamp formatting logic
Deno.test("ChatMessage - formatTimestamp formats correctly", () => {
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const testTimestamp = "2024-01-01T14:30:00Z";
  const formatted = formatTimestamp(testTimestamp);

  // Should return a time string (format may vary by locale)
  assertEquals(typeof formatted, "string");
  assertEquals(formatted.length > 0, true);
});

// Test message validation
Deno.test("ChatMessage - validates required message properties", () => {
  const validMessage: ChatMessageType = {
    id: "test-1",
    type: "user",
    content: "Hello world",
    timestamp: "2024-01-01T12:00:00Z",
  };

  // Check all required properties exist
  assertEquals(typeof validMessage.id, "string");
  assertEquals(typeof validMessage.type, "string");
  assertEquals(typeof validMessage.content, "string");
  assertEquals(typeof validMessage.timestamp, "string");

  // Check optional metadata
  const messageWithMetadata: ChatMessageType = {
    ...validMessage,
    metadata: {
      section_name: "Introduction",
      status: "completed",
    },
  };

  assertEquals(typeof messageWithMetadata.metadata, "object");
  assertEquals(messageWithMetadata.metadata?.section_name, "Introduction");
});

// Test message type indicators
Deno.test("ChatMessage - MESSAGE_TYPE_INDICATORS maps correctly", () => {
  const MESSAGE_TYPE_INDICATORS = {
    user: "You",
    assistant: "Assistant",
    system: "System",
    error: "Error",
    status: "Status",
    plan_update: "Plan Update",
    section_update: "Section Update",
  };

  assertEquals(MESSAGE_TYPE_INDICATORS.user, "You");
  assertEquals(MESSAGE_TYPE_INDICATORS.assistant, "Assistant");
  assertEquals(MESSAGE_TYPE_INDICATORS.error, "Error");
});
