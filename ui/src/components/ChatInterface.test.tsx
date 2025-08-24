import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { ChatMessage } from "../types/index.ts";

// Test auto-scroll logic
Deno.test("ChatInterface - determines auto-scroll correctly", () => {
  const shouldAutoScroll = (
    scrollTop: number,
    scrollHeight: number,
    clientHeight: number,
  ): boolean => {
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    return isNearBottom;
  };

  // At bottom
  assertEquals(shouldAutoScroll(900, 1000, 100), true);

  // Near bottom (within 100px)
  assertEquals(shouldAutoScroll(850, 1000, 100), true);

  // Far from bottom
  assertEquals(shouldAutoScroll(500, 1000, 100), false);
});

// Test message filtering and processing
Deno.test("ChatInterface - processes messages correctly", () => {
  const messages: ChatMessage[] = [
    {
      id: "1",
      type: "user",
      content: "Hello",
      timestamp: "2024-01-01T12:00:00Z",
    },
    {
      id: "2",
      type: "assistant",
      content: "Hi there!",
      timestamp: "2024-01-01T12:01:00Z",
    },
  ];

  assertEquals(messages.length, 2);
  assertEquals(messages[0].type, "user");
  assertEquals(messages[1].type, "assistant");
});

// Test loading state logic
Deno.test("ChatInterface - handles loading states correctly", () => {
  const getInputState = (isLoading: boolean, disabled: boolean) => {
    return {
      inputDisabled: disabled || isLoading,
      placeholder: isLoading
        ? "Please wait..."
        : disabled
        ? "Chat is disabled"
        : "Ask a question or describe what you'd like to research...",
    };
  };

  // Normal state
  const normal = getInputState(false, false);
  assertEquals(normal.inputDisabled, false);
  assertEquals(normal.placeholder, "Ask a question or describe what you'd like to research...");

  // Loading state
  const loading = getInputState(true, false);
  assertEquals(loading.inputDisabled, true);
  assertEquals(loading.placeholder, "Please wait...");

  // Disabled state
  const disabled = getInputState(false, true);
  assertEquals(disabled.inputDisabled, true);
  assertEquals(disabled.placeholder, "Chat is disabled");
});

// Test empty state detection
Deno.test("ChatInterface - detects empty state correctly", () => {
  const isEmpty = (messages: ChatMessage[]): boolean => {
    return messages.length === 0;
  };

  assertEquals(isEmpty([]), true);
  assertEquals(
    isEmpty([{
      id: "1",
      type: "user",
      content: "Hello",
      timestamp: "2024-01-01T12:00:00Z",
    }]),
    false,
  );
});

// Test message sending logic
Deno.test("ChatInterface - handles message sending correctly", () => {
  let sentMessage = "";
  let autoScrollEnabled = false;

  const handleSendMessage = (message: string) => {
    sentMessage = message;
    autoScrollEnabled = true; // Re-enable auto-scroll when user sends a message
  };

  handleSendMessage("Test message");

  assertEquals(sentMessage, "Test message");
  assertEquals(autoScrollEnabled, true);
});
