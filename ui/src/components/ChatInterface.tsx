import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChatMessage as ChatMessageType } from "../types/index.ts";
import ChatMessage from "./ChatMessage.tsx";
import ChatInput from "./ChatInput.tsx";
import VirtualScrollList from "./VirtualScrollList.tsx";
import clsx from "clsx";

interface ChatInterfaceProps {
  messages: ChatMessageType[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
}

export function ChatInterface({
  messages,
  onSendMessage,
  isLoading = false,
  disabled = false,
  className,
}: ChatInterfaceProps): React.ReactElement {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [containerHeight, setContainerHeight] = useState(400);

  // Use virtual scrolling for large message lists (>50 messages)
  const useVirtualScrolling = messages.length > 50;
  const estimatedMessageHeight = 80; // Estimated height per message

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    if (shouldAutoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [shouldAutoScroll]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Check if user has scrolled up to disable auto-scroll
  const handleScroll = useCallback((scrollTop?: number) => {
    if (!messagesContainerRef.current && scrollTop === undefined) return;

    const container = messagesContainerRef.current;
    const currentScrollTop = scrollTop ?? container?.scrollTop ?? 0;
    const scrollHeight = container?.scrollHeight ?? 0;
    const clientHeight = container?.clientHeight ?? containerHeight;
    
    const isNearBottom = scrollHeight - currentScrollTop - clientHeight < 100;
    setShouldAutoScroll(isNearBottom);
  }, [containerHeight]);

  // Re-enable auto-scroll when user scrolls to bottom
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || useVirtualScrolling) return;

    const scrollHandler = () => handleScroll();
    container.addEventListener("scroll", scrollHandler);
    return () => container.removeEventListener("scroll", scrollHandler);
  }, [handleScroll, useVirtualScrolling]);

  // Update container height on resize
  useEffect(() => {
    const updateHeight = () => {
      if (messagesContainerRef.current) {
        setContainerHeight(messagesContainerRef.current.clientHeight);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const handleSendMessage = useCallback(
    (message: string) => {
      onSendMessage(message);
      setShouldAutoScroll(true); // Re-enable auto-scroll when user sends a message
    },
    [onSendMessage],
  );

  return (
    <div className={clsx("flex flex-col h-full bg-white dark:bg-gray-800", className)} role="main" aria-label="Chat interface">
      {/* Messages container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-2 sm:px-4 py-3 sm:py-6 space-y-3 sm:space-y-4 overscroll-behavior-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
        aria-atomic="false"
      >
        {messages.length === 0
          ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <div className="text-lg font-medium mb-2">Start a conversation</div>
                <div className="text-sm">
                  Ask a question or describe what you'd like to research
                </div>
              </div>
            </div>
          )
          : useVirtualScrolling ? (
            <VirtualScrollList
              items={messages}
              itemHeight={estimatedMessageHeight}
              containerHeight={containerHeight}
              renderItem={(message, index) => (
                <ChatMessage key={message.id} message={message} />
              )}
              onScroll={handleScroll}
              className="w-full"
            />
          ) : (
            <>
              {messages.map((message) => <ChatMessage key={message.id} message={message} />)}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400" role="status" aria-live="polite">
                  <div className="flex space-x-1" aria-hidden="true">
                    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    >
                    </div>
                    <div
                      className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    >
                    </div>
                  </div>
                  <span className="text-sm">Assistant is typing...</span>
                </div>
              )}
            </>
          )}
        
        {/* Loading indicator for virtual scrolling */}
        {useVirtualScrolling && isLoading && (
          <div className="flex items-center justify-center space-x-2 text-gray-500 dark:text-gray-400 p-4" role="status" aria-live="polite">
            <div className="flex space-x-1" aria-hidden="true">
              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"></div>
              <div
                className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
                style={{ animationDelay: "0.1s" }}
              >
              </div>
              <div
                className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              >
              </div>
            </div>
            <span className="text-sm">Assistant is typing...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {!shouldAutoScroll && (
        <div className="flex justify-center pb-2">
          <button
            onClick={scrollToBottom}
            className="px-3 py-2 bg-blue-500 dark:bg-blue-600 text-white text-sm rounded-full hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors shadow-md touch-manipulation focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Scroll to bottom to see new messages"
          >
            ↓ New messages
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-2 sm:p-4">
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={disabled || isLoading}
          placeholder={isLoading
            ? "Please wait..."
            : disabled
            ? "Chat is disabled"
            : "Ask a question or describe what you'd like to research..."}
        />
      </div>
    </div>
  );
}

export default ChatInterface;
