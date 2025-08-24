import React, { useCallback, useRef, useState } from "react";
import clsx from "clsx";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}

export function ChatInput({
  onSendMessage,
  disabled = false,
  placeholder = "Type your message...",
  maxLength = 1000,
  className,
}: ChatInputProps): React.ReactElement {
  const [inputValue, setInputValue] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [announceMessage, setAnnounceMessage] = useState("");

  const isValid = inputValue.trim().length > 0 && inputValue.length <= maxLength;

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!isValid || disabled || isComposing) return;

      const message = inputValue.trim();
      onSendMessage(message);
      setInputValue("");
      
      // Announce message sent for screen readers
      setAnnounceMessage("Message sent");
      setTimeout(() => setAnnounceMessage(""), 1000);

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    },
    [inputValue, isValid, disabled, isComposing, onSendMessage],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey && !isComposing) {
        e.preventDefault();
        handleSubmit(e);
      }
    },
    [handleSubmit, isComposing],
  );

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, []);

  const handleCompositionStart = useCallback(() => {
    setIsComposing(true);
  }, []);

  const handleCompositionEnd = useCallback(() => {
    setIsComposing(false);
  }, []);

  const characterCount = inputValue.length;
  const isNearLimit = characterCount > maxLength * 0.8;
  const isOverLimit = characterCount > maxLength;

  return (
    <form onSubmit={handleSubmit} className={clsx("flex flex-col gap-2", className)} role="form" aria-label="Send message form">
      {/* Screen reader announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announceMessage}
      </div>
      
      <div className="relative">
        <label htmlFor="chat-input" className="sr-only">
          Type your message
        </label>
        <textarea
          id="chat-input"
          ref={textareaRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          aria-describedby="char-count help-text"
          aria-invalid={isOverLimit}
          aria-required="true"
          className={clsx(
            "w-full px-3 sm:px-4 py-2 sm:py-3 pr-10 sm:pr-12 rounded-lg border resize-none text-sm sm:text-base",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
            "disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500",
            "touch-manipulation", // Improves touch responsiveness
            isOverLimit ? "border-red-300 focus:ring-red-500" : "border-gray-300 dark:border-gray-600",
            "dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400",
          )}
          style={{
            minHeight: "44px", // Slightly smaller for mobile
            maxHeight: "120px",
          }}
        />

        {/* Send button */}
        <button
          type="submit"
          disabled={!isValid || disabled}
          className={clsx(
            "absolute right-1 sm:right-2 bottom-1 sm:bottom-2 p-2 rounded-md transition-colors touch-manipulation",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
            "min-h-[40px] min-w-[40px] flex items-center justify-center", // Ensure touch target is large enough
            isValid && !disabled
              ? "text-blue-600 hover:bg-blue-50 active:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900 dark:active:bg-blue-800"
              : "text-gray-400 cursor-not-allowed",
          )}
          aria-label="Send message"
        >
          <svg
            className="w-4 h-4 sm:w-5 sm:h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </button>
      </div>

      {/* Character count and validation */}
      <div className="flex justify-between items-center text-xs">
        <div id="help-text" className="text-gray-500 dark:text-gray-400 flex-1 mr-2">
          {disabled && <span>Chat is disabled</span>}
          {!disabled && inputValue.trim().length === 0 && (
            <span className="hidden sm:inline">Press Enter to send, Shift+Enter for new line</span>
          )}
          {isOverLimit && (
            <span className="text-red-600 dark:text-red-400" role="alert">
              Message exceeds character limit
            </span>
          )}
        </div>
        <div
          id="char-count"
          className={clsx(
            "font-medium text-xs",
            isOverLimit ? "text-red-600 dark:text-red-400" : isNearLimit ? "text-yellow-600 dark:text-yellow-400" : "text-gray-500 dark:text-gray-400",
          )}
          aria-label={`${characterCount} of ${maxLength} characters used`}
        >
          {characterCount}/{maxLength}
        </div>
      </div>
    </form>
  );
}

export default ChatInput;
