import React from "react";
import { ChatMessage as ChatMessageType } from "../types/index.ts";
import clsx from "clsx";

interface ChatMessageProps {
  message: ChatMessageType;
  className?: string;
}

const MESSAGE_TYPE_STYLES = {
  user: "bg-blue-500 text-white ml-auto",
  assistant: "bg-white text-gray-900 border border-gray-200",
  system: "bg-gray-100 text-gray-700 text-sm",
  error: "bg-red-50 text-red-800 border border-red-200",
  status: "bg-yellow-50 text-yellow-800 border border-yellow-200",
  plan_update: "bg-green-50 text-green-800 border border-green-200",
  section_update: "bg-blue-50 text-blue-800 border border-blue-200",
} as const;

const MESSAGE_TYPE_INDICATORS = {
  user: "You",
  assistant: "Assistant",
  system: "System",
  error: "Error",
  status: "Status",
  plan_update: "Plan Update",
  section_update: "Section Update",
} as const;

export function ChatMessage({ message, className }: ChatMessageProps): React.ReactElement {
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const messageStyles = MESSAGE_TYPE_STYLES[message.type];
  const typeIndicator = MESSAGE_TYPE_INDICATORS[message.type];

  return (
    <div
      className={clsx(
        "flex flex-col max-w-[85%] sm:max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl",
        message.type === "user" ? "ml-auto" : "mr-auto",
        className,
      )}
      role="article"
      aria-label={`${typeIndicator} message`}
    >
      {/* Message type indicator and timestamp */}
      <div
        className={clsx(
          "flex items-center gap-2 mb-1 text-xs text-gray-500",
          message.type === "user" ? "justify-end" : "justify-start",
        )}
      >
        <span className="font-medium">{typeIndicator}</span>
        <span>•</span>
        <time dateTime={message.timestamp}>{formatTimestamp(message.timestamp)}</time>
      </div>

      {/* Message content */}
      <div
        className={clsx(
          "rounded-lg px-4 py-2 shadow-sm",
          messageStyles,
        )}
      >
        <div className="whitespace-pre-wrap break-words">
          {message.content}
        </div>

        {/* Metadata display for special message types */}
        {message.metadata && (
          <div className="mt-2 pt-2 border-t border-current border-opacity-20">
            <div className="text-xs opacity-75">
              {message.metadata.section_name && <div>Section: {message.metadata.section_name}</div>}
              {message.metadata.search_query && <div>Query: {message.metadata.search_query}</div>}
              {message.metadata.status && <div>Status: {message.metadata.status}</div>}
              {message.metadata.error_code && <div>Error Code: {message.metadata.error_code}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatMessage;
