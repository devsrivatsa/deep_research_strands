import React, { useState } from "react";
import { createRoot } from "react-dom/client";

// Simple chat message component
interface ChatMessageProps {
  type: "user" | "assistant" | "system";
  content: string;
}

function ChatMessage({ type, content }: ChatMessageProps): React.ReactElement {
  const messageStyles = {
    user: "bg-blue-500 text-white ml-auto",
    assistant: "bg-white text-gray-900 border border-gray-200",
    system: "bg-gray-100 text-gray-700 text-sm"
  };
  
  const style = messageStyles[type] || messageStyles.system;
  
  return (
    <div className={`flex flex-col max-w-xs sm:max-w-md md:max-w-lg lg:max-w-xl ${type === 'user' ? 'ml-auto' : 'mr-auto'} mb-4`}>
      <div className={`rounded-lg px-4 py-2 shadow-sm ${style}`}>
        <div className="whitespace-pre-wrap break-words">
          {content}
        </div>
      </div>
    </div>
  );
}

// Chat input component
interface ChatInputProps {
  onSendMessage: (message: string) => void;
}

function ChatInput({ onSendMessage }: ChatInputProps): React.ReactElement {
  const [inputValue, setInputValue] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="relative">
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask a question or describe what you'd like to research..."
          rows={1}
          className="w-full px-4 py-3 pr-12 rounded-lg border resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          style={{
            minHeight: '48px',
            maxHeight: '120px'
          }}
        />
        <button
          type="submit"
          disabled={!inputValue.trim()}
          className={`absolute right-2 bottom-2 p-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
            inputValue.trim() 
              ? 'text-blue-600 hover:bg-blue-50 active:bg-blue-100' 
              : 'text-gray-400 cursor-not-allowed'
          }`}
        >
          <svg
            className="w-5 h-5"
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
    </form>
  );
}

// Main App component
function App(): React.ReactElement {
  const [messages, setMessages] = useState([
    {
      id: '1',
      type: 'system' as const,
      content: 'Welcome to Deep Research! Ask a question to get started.'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSendMessage = (content: string) => {
    // Add user message
    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      content
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    
    // Simulate assistant response
    setTimeout(() => {
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant' as const,
        content: `I received your message: "${content}". This is a demo response showing the chat interface working correctly.`
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Deep Research
            </h1>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="h-full bg-white rounded-lg shadow-sm border">
          {/* Messages container */}
          <div 
            className="flex-1 overflow-y-auto px-4 py-6 space-y-4" 
            style={{ maxHeight: '60vh', overflowY: 'auto' }}
          >
            {messages.map(message => 
              <ChatMessage 
                key={message.id}
                type={message.type}
                content={message.content}
              />
            )}
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="flex items-center space-x-2 text-gray-500">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div 
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.1s' }}
                  ></div>
                  <div 
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  ></div>
                </div>
                <span className="text-sm">Assistant is typing...</span>
              </div>
            )}
          </div>
          
          {/* Input area */}
          <div className="border-t border-gray-200 p-4">
            <ChatInput onSendMessage={handleSendMessage} />
          </div>
        </div>
      </main>
    </div>
  );
}

// Render the App component
const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);
root.render(<App />);