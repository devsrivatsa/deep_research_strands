import React from "react";
import { ChatInterface, ThemeToggle, ResearchPlanViewer, ReportViewer } from "./src/components/index.ts";
import { ChatMessage, ResearchPlan } from "./src/types/index.ts";

// Simple test to verify responsive components render without errors
function ResponsiveTest() {
  const mockMessages: ChatMessage[] = [
    {
      id: "1",
      type: "system",
      content: "Welcome to Deep Research! This is a test message to verify responsive design.",
      timestamp: new Date().toISOString(),
    },
    {
      id: "2", 
      type: "user",
      content: "This is a user message to test the responsive chat interface.",
      timestamp: new Date().toISOString(),
    },
    {
      id: "3",
      type: "assistant", 
      content: "This is an assistant response to test how messages display on different screen sizes.",
      timestamp: new Date().toISOString(),
    }
  ];

  const mockPlan: ResearchPlan = {
    sections: [
      {
        name: "Introduction and Background",
        description: "Overview and context for the research topic",
        research: true,
        content: "Initial content for the introduction section.",
      },
      {
        name: "Current State Analysis",
        description: "Analysis of the current situation and existing research",
        research: true,
        content: "",
      },
      {
        name: "Key Findings and Insights",
        description: "Main discoveries and important insights from the research",
        research: true,
        content: "",
      },
    ],
  };

  const handleSendMessage = (message: string) => {
    console.log("Message sent:", message);
  };

  const handlePlanApprove = () => {
    console.log("Plan approved");
  };

  const handlePlanFeedback = (feedback: string) => {
    console.log("Plan feedback:", feedback);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6 text-center">Responsive Design Test</h1>
        
        {/* Test Theme Toggle */}
        <div className="mb-6 flex justify-center">
          <ThemeToggle />
        </div>

        {/* Test Chat Interface */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Chat Interface (Mobile Responsive)</h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 h-96">
            <ChatInterface
              messages={mockMessages}
              onSendMessage={handleSendMessage}
              isLoading={false}
            />
          </div>
        </div>

        {/* Test Research Plan Viewer */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Research Plan Viewer (Mobile Responsive)</h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <ResearchPlanViewer
              plan={mockPlan}
              onApprove={handlePlanApprove}
              onRequestChanges={handlePlanFeedback}
            />
          </div>
        </div>

        {/* Test Report Viewer */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Report Viewer (Mobile Responsive)</h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 h-96">
            <ReportViewer
              report="<h1>Test Report</h1><p>This is a test report to verify responsive design works correctly on mobile devices.</p>"
              sessionId="test-session"
              onExport={(format) => console.log("Export:", format)}
              onShare={(content) => console.log("Share:", content)}
            />
          </div>
        </div>

        <div className="text-center text-gray-600 dark:text-gray-400">
          <p>Test the responsive design by resizing your browser window or viewing on mobile devices.</p>
        </div>
      </div>
    </div>
  );
}

export default ResponsiveTest;