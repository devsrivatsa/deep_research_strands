import React from "react";
import { render, screen } from "https://esm.sh/@testing-library/react@14.0.0";
import { ChatMessage } from "./ChatMessage.tsx";
import { AccessibilityTester, createAccessibilityTest } from "../utils/accessibility.test.ts";
import type { ChatMessage as ChatMessageType } from "../types/index.ts";

describe("ChatMessage Accessibility", () => {
  const mockMessage: ChatMessageType = {
    id: "test-1",
    type: "user",
    content: "Hello, this is a test message",
    timestamp: "2024-01-01T12:00:00Z",
  };

  const accessibilityTest = createAccessibilityTest("ChatMessage");

  test("should have no accessibility violations", async () => {
    const { container } = render(<ChatMessage message={mockMessage} />);
    await accessibilityTest.testAll(container);
  });

  test("should have proper semantic structure", () => {
    render(<ChatMessage message={mockMessage} />);
    
    // Check that message has article role
    const messageElement = screen.getByRole("article");
    expect(messageElement).toBeInTheDocument();
    expect(messageElement).toHaveAttribute("aria-label", "You message");
  });

  test("should provide accessible timestamp", () => {
    render(<ChatMessage message={mockMessage} />);
    
    // Check that timestamp is properly formatted
    const timeElement = screen.getByText("12:00 PM");
    expect(timeElement.tagName).toBe("TIME");
    expect(timeElement).toHaveAttribute("dateTime", mockMessage.timestamp);
  });

  test("should handle different message types", () => {
    const messageTypes: ChatMessageType["type"][] = [
      "user", "assistant", "system", "error", "status", "plan_update", "section_update"
    ];

    messageTypes.forEach(type => {
      const message: ChatMessageType = {
        ...mockMessage,
        type,
        id: `test-${type}`,
      };

      const { rerender } = render(<ChatMessage message={message} />);
      
      // Check that message type is announced
      const messageElement = screen.getByRole("article");
      expect(messageElement).toHaveAttribute("aria-label", expect.stringContaining(type === "user" ? "You" : type.replace("_", " ")));
      
      rerender(<div />); // Clear for next iteration
    });
  });

  test("should handle error messages appropriately", () => {
    const errorMessage: ChatMessageType = {
      ...mockMessage,
      type: "error",
      content: "An error occurred",
      metadata: {
        error_code: "500",
      },
    };

    render(<ChatMessage message={errorMessage} />);
    
    // Error messages should be more prominent for screen readers
    const messageElement = screen.getByRole("article");
    expect(messageElement).toHaveAttribute("aria-label", "Error message");
    
    // Check that error metadata is displayed
    expect(screen.getByText("Error Code: 500")).toBeInTheDocument();
  });

  test("should display metadata accessibly", () => {
    const messageWithMetadata: ChatMessageType = {
      ...mockMessage,
      type: "plan_update",
      metadata: {
        section_name: "Introduction",
        status: "completed",
      },
    };

    render(<ChatMessage message={messageWithMetadata} />);
    
    // Check that metadata is displayed
    expect(screen.getByText("Section: Introduction")).toBeInTheDocument();
    expect(screen.getByText("Status: completed")).toBeInTheDocument();
  });

  test("should work with high contrast mode", () => {
    document.documentElement.classList.add("high-contrast");
    
    const { container } = render(<ChatMessage message={mockMessage} />);
    
    AccessibilityTester.testColorContrast(container);
    
    document.documentElement.classList.remove("high-contrast");
  });

  test("should handle long content appropriately", () => {
    const longMessage: ChatMessageType = {
      ...mockMessage,
      content: "This is a very long message that should wrap properly and maintain good readability. ".repeat(10),
    };

    render(<ChatMessage message={longMessage} />);
    
    const messageElement = screen.getByRole("article");
    expect(messageElement).toBeInTheDocument();
    
    // Check that content is properly wrapped
    const contentElement = screen.getByText(longMessage.content);
    expect(contentElement).toHaveClass("whitespace-pre-wrap", "break-words");
  });

  test("should support different message alignments", () => {
    // Test user message (right-aligned)
    const { rerender } = render(<ChatMessage message={mockMessage} />);
    let messageContainer = screen.getByRole("article").parentElement;
    expect(messageContainer).toHaveClass("ml-auto");

    // Test assistant message (left-aligned)
    const assistantMessage: ChatMessageType = {
      ...mockMessage,
      type: "assistant",
    };
    
    rerender(<ChatMessage message={assistantMessage} />);
    messageContainer = screen.getByRole("article").parentElement;
    expect(messageContainer).toHaveClass("mr-auto");
  });

  test("should provide context for message types", () => {
    const systemMessage: ChatMessageType = {
      ...mockMessage,
      type: "system",
      content: "System notification",
    };

    render(<ChatMessage message={systemMessage} />);
    
    // Check that message type indicator is present
    expect(screen.getByText("System")).toBeInTheDocument();
    
    // Check that the message has appropriate styling context
    const messageElement = screen.getByRole("article");
    expect(messageElement).toHaveAttribute("aria-label", "System message");
  });
});