import React, { useState, useEffect, useCallback, Suspense, lazy } from "react";
import { clsx } from "clsx";
import { 
  ThemeToggle, 
  ErrorBoundary, 
  ToastContainer
} from "./components/index.ts";

// Lazy load components for code splitting
const ChatInterface = lazy(() => import("./components/ChatInterface.tsx"));
const ResearchPlanViewer = lazy(() => import("./components/ResearchPlanViewer.tsx"));
const ReportViewer = lazy(() => import("./components/ReportViewer.tsx"));
const ProjectManager = lazy(() => import("./components/ProjectManager.tsx"));
import { ChatMessage, ResearchPlan, WebSocketMessage } from "./types/index.ts";
import { useAppStore } from "./store/index.ts";
import { initializeAccessibility } from "./utils/accessibility.ts";
import { useAccessibility } from "./hooks/useAccessibility.ts";
import { useToast } from "./components/Toast.tsx";
import { useOfflineDetection } from "./hooks/useOfflineDetection.ts";
import { WebSocketManager } from "./utils/WebSocketManager.ts";
import { apiClient } from "./utils/APIClient.ts";
import { performanceMonitor, measureRender, measureApiCall } from "./utils/performance.ts";

// Loading skeleton components
function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
    </div>
  );
}

function ChatSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-end">
        <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-3 max-w-xs animate-pulse">
          <LoadingSkeleton />
        </div>
      </div>
      <div className="flex justify-start">
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 max-w-xs animate-pulse">
          <LoadingSkeleton />
        </div>
      </div>
    </div>
  );
}

function App(): React.ReactElement {
  // Store state
  const { 
    ui, 
    session, 
    chat,
    setActiveTab, 
    setCurrentSession,
    setCurrentPlan,
    setCurrentReport,
    setConnectionStatus,
    addMessage,
    setIsTyping,
    handleWebSocketMessage,
    setLoadingState,
    setErrorState,
    clearErrorStates
  } = useAppStore();

  // Local state for application initialization
  const [isInitialized, setIsInitialized] = useState(false);
  const [wsManager, setWsManager] = useState<WebSocketManager | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Hooks
  const accessibility = useAccessibility();
  const { toasts, success, error, warning, info, dismissToast } = useToast();
  
  // Initialize offline detection with user feedback
  const offline = useOfflineDetection({
    onOffline: () => {
      warning(
        "Connection Lost",
        "You are now offline. Some features may not work properly.",
        { duration: 8000 }
      );
    },
    onOnline: () => {
      if (offline.wasOffline) {
        success(
          "Connection Restored",
          `You are back online! You were offline for ${Math.round(offline.downtime / 1000)} seconds.`,
          { duration: 6000 }
        );
        offline.resetOfflineState();
      }
    },
  });

  // Initialize application
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setLoadingState("app_init", true);
        
        // Initialize accessibility features
        await initializeAccessibility();
        
        // Initialize WebSocket connection
        const wsUrl = `ws://localhost:8000/ws`;
        const manager = new WebSocketManager(
          { url: wsUrl },
          {
            onMessage: handleWebSocketMessage,
            onStatusChange: (status) => {
              setConnectionStatus(status === "connected" ? "connected" : "disconnected");
            },
            onError: (wsError) => {
              error("Connection Error", wsError.message);
            },
            onReconnectAttempt: (attempt, maxAttempts) => {
              info("Reconnecting", `Attempt ${attempt} of ${maxAttempts}`);
            },
          }
        );
        
        setWsManager(manager);
        manager.connect();
        
        // Add welcome message
        addMessage({
          id: crypto.randomUUID(),
          type: "system",
          content: "Welcome to Deep Research! Ask a question to get started with AI-powered research.",
          timestamp: new Date().toISOString(),
        });
        
        setIsInitialized(true);
        success("Application Ready", "Deep Research is ready to use!");
        
      } catch (initError) {
        console.error("Failed to initialize application:", initError);
        error("Initialization Failed", "Failed to start the application. Please refresh the page.");
      } finally {
        setLoadingState("app_init", false);
      }
    };

    initializeApp();

    // Cleanup on unmount
    return () => {
      if (wsManager) {
        wsManager.disconnect();
      }
    };
  }, []);

  // Handle mobile screen size detection
  useEffect(() => {
    const checkMobile = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle sending messages
  const handleSendMessage = useCallback(async (content: string) => {
    if (!wsManager || !wsManager.isConnected()) {
      error("Not Connected", "Please wait for the connection to be established.");
      return;
    }

    // Add user message to chat
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      type: "user",
      content,
      timestamp: new Date().toISOString(),
    };
    addMessage(userMessage);

    try {
      // Send message through WebSocket
      const success = wsManager.send({
        type: "user_message",
        data: { message: content },
        timestamp: new Date().toISOString(),
      });

      if (!success) {
        throw new Error("Failed to send message");
      }

      setIsTyping(true);
    } catch (sendError) {
      console.error("Failed to send message:", sendError);
      error("Send Failed", "Failed to send your message. Please try again.");
    }
  }, [wsManager, addMessage, setIsTyping, error]);

  // Handle plan approval
  const handlePlanApprove = useCallback(async () => {
    if (!session.current_session_id) {
      error("No Session", "No active research session found.");
      return;
    }

    try {
      setLoadingState("plan_approval", true);
      const response = await measureApiCall("approvePlan", () => 
        apiClient.approvePlan(session.current_session_id!)
      );
      
      if (response.success) {
        success("Plan Approved", "Research will begin shortly.");
        addMessage({
          id: crypto.randomUUID(),
          type: "system",
          content: "Research plan approved! Starting research process...",
          timestamp: new Date().toISOString(),
        });
      } else {
        throw new Error(response.error?.message || "Failed to approve plan");
      }
    } catch (approveError) {
      console.error("Failed to approve plan:", approveError);
      error("Approval Failed", "Failed to approve the research plan. Please try again.");
    } finally {
      setLoadingState("plan_approval", false);
    }
  }, [session.current_session_id, success, error, addMessage, setLoadingState]);

  // Handle plan feedback
  const handlePlanFeedback = useCallback(async (feedback: string) => {
    if (!session.current_session_id) {
      error("No Session", "No active research session found.");
      return;
    }

    try {
      setLoadingState("plan_feedback", true);
      const response = await measureApiCall("submitPlanFeedback", () =>
        apiClient.submitPlanFeedback({
          session_id: session.current_session_id!,
          feedback,
        })
      );

      if (response.success) {
        success("Feedback Submitted", "The research plan will be updated based on your feedback.");
        addMessage({
          id: crypto.randomUUID(),
          type: "user",
          content: `Plan feedback: ${feedback}`,
          timestamp: new Date().toISOString(),
        });
      } else {
        throw new Error(response.error?.message || "Failed to submit feedback");
      }
    } catch (feedbackError) {
      console.error("Failed to submit feedback:", feedbackError);
      error("Feedback Failed", "Failed to submit feedback. Please try again.");
    } finally {
      setLoadingState("plan_feedback", false);
    }
  }, [session.current_session_id, success, error, addMessage, setLoadingState]);

  // Handle report export
  const handleReportExport = useCallback(async (format: "pdf" | "markdown" | "html") => {
    if (!session.current_session_id) {
      error("No Session", "No active research session found.");
      return;
    }

    try {
      setLoadingState("report_export", true);
      const response = await measureApiCall("exportReport", () =>
        apiClient.exportReport({
          session_id: session.current_session_id!,
          format,
          options: {
            include_metadata: true,
            include_sources: true,
          },
        })
      );

      if (response.success && response.data) {
        success("Export Ready", `Report exported as ${format.toUpperCase()}`);
        // Open download URL in new tab
        window.open(response.data.download_url, '_blank');
      } else {
        throw new Error(response.error?.message || "Failed to export report");
      }
    } catch (exportError) {
      console.error("Failed to export report:", exportError);
      error("Export Failed", "Failed to export the report. Please try again.");
    } finally {
      setLoadingState("report_export", false);
    }
  }, [session.current_session_id, success, error, setLoadingState]);

  // Handle report sharing
  const handleReportShare = useCallback((content: string) => {
    if (navigator.share) {
      navigator.share({
        title: "Deep Research Report",
        text: content.substring(0, 200) + "...",
        url: window.location.href,
      }).catch((shareError) => {
        console.error("Failed to share:", shareError);
        // Fallback to clipboard
        navigator.clipboard.writeText(content).then(() => {
          success("Copied to Clipboard", "Report content copied to clipboard.");
        });
      });
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(content).then(() => {
        success("Copied to Clipboard", "Report content copied to clipboard.");
      }).catch(() => {
        error("Share Failed", "Unable to share or copy the report.");
      });
    }
  }, [success, error]);

  // Show loading screen during initialization
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Initializing Deep Research
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Setting up your research environment...
          </p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary
      onError={(appError, errorInfo) => {
        error("Application Error", `An unexpected error occurred: ${appError.message}`);
        console.error("App Error:", appError, errorInfo);
      }}
    >
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-3 md:py-4">
              <div className="flex items-center space-x-4">
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Deep Research
                </h1>
                
                {/* Connection Status Indicator */}
                <div className="flex items-center space-x-2">
                  <div className={clsx(
                    "w-2 h-2 rounded-full",
                    session.connection_status === "connected" ? "bg-green-500" : "bg-red-500"
                  )}></div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {session.connection_status === "connected" ? "Connected" : "Disconnected"}
                  </span>
                </div>
              </div>
              
              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-4">
                <nav className="flex space-x-2 lg:space-x-4" role="tablist" aria-label="Main navigation">
                  {[
                    { key: "chat", label: "Chat" },
                    { key: "plan", label: "Plan" },
                    { key: "report", label: "Report" },
                    { key: "projects", label: "Projects" },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as any)}
                      className={clsx(
                        "px-3 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                        ui.active_tab === tab.key
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                          : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                      )}
                      role="tab"
                      aria-selected={ui.active_tab === tab.key}
                      aria-controls={`${tab.key}-panel`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
                
                {/* Accessibility Controls */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={accessibility.toggleHighContrast}
                    className={clsx(
                      "p-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                      accessibility.highContrast
                        ? "bg-yellow-100 text-yellow-800 border border-yellow-300"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    )}
                    aria-label={accessibility.highContrast ? "Disable high contrast mode" : "Enable high contrast mode"}
                    title={accessibility.highContrast ? "Disable high contrast mode" : "Enable high contrast mode"}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </button>
                  <ThemeToggle />
                </div>
              </div>

              {/* Mobile Menu Button and Theme Toggle */}
              <div className="flex md:hidden items-center space-x-2">
                <ThemeToggle />
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Toggle mobile menu"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isMobileMenuOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
              </div>
            </div>

            {/* Mobile Navigation Menu */}
            {isMobileMenuOpen && (
              <div className="md:hidden border-t border-gray-200 dark:border-gray-700 py-3">
                <nav className="flex flex-col space-y-2">
                  {[
                    { key: "chat", label: "Chat" },
                    { key: "plan", label: "Plan" },
                    { key: "report", label: "Report" },
                    { key: "projects", label: "Projects" },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => {
                        setActiveTab(tab.key as any);
                        setIsMobileMenuOpen(false);
                      }}
                      className={clsx(
                        "px-3 py-2 rounded-md text-sm font-medium transition-colors text-left",
                        ui.active_tab === tab.key
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                          : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>
            )}
          </div>
        </header>
        
        {/* Main Content */}
        <main id="main-content" className="flex-1 max-w-7xl mx-auto w-full px-2 sm:px-4 lg:px-8 py-4 md:py-8">
          {/* Chat Tab */}
          {ui.active_tab === "chat" && (
            <div id="chat-panel" role="tabpanel" aria-labelledby="chat-tab" className="flex flex-col lg:grid lg:grid-cols-2 gap-4 md:gap-8 h-full">
              {/* Chat Interface */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 h-[50vh] lg:h-full">
                {ui.loading_states.app_init ? (
                  <ChatSkeleton />
                ) : (
                  <Suspense fallback={<ChatSkeleton />}>
                    <ChatInterface
                      messages={chat.messages}
                      onSendMessage={handleSendMessage}
                      isLoading={chat.is_typing || ui.loading_states.plan_approval || false}
                    />
                  </Suspense>
                )}
              </div>
              
              {/* Research Plan Viewer */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 h-[50vh] lg:h-full">
                {session.current_plan ? (
                  <Suspense fallback={<LoadingSkeleton />}>
                    <ResearchPlanViewer
                      plan={session.current_plan}
                      onApprove={handlePlanApprove}
                      onRequestChanges={handlePlanFeedback}
                      className="h-full"
                      isLoading={ui.loading_states.plan_approval || ui.loading_states.plan_feedback || false}
                    />
                  </Suspense>
                ) : (
                  <div className="p-4 md:p-6 text-center text-gray-500 dark:text-gray-400 h-full flex items-center justify-center" role="status" aria-label="No research plan available">
                    <div>
                      <div className="text-base md:text-lg font-medium mb-2">No research plan yet</div>
                      <div className="text-sm">
                        Ask a research question to generate a plan
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Plan Tab */}
          {ui.active_tab === "plan" && (
            <div id="plan-panel" role="tabpanel" aria-labelledby="plan-tab" className="h-[calc(100vh-8rem)] md:h-full">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 h-full">
                {session.current_plan ? (
                  <Suspense fallback={<LoadingSkeleton />}>
                    <ResearchPlanViewer
                      plan={session.current_plan}
                      onApprove={handlePlanApprove}
                      onRequestChanges={handlePlanFeedback}
                      className="h-full"
                      isLoading={ui.loading_states.plan_approval || ui.loading_states.plan_feedback || false}
                    />
                  </Suspense>
                ) : (
                  <div className="p-4 md:p-6 text-center text-gray-500 dark:text-gray-400 h-full flex items-center justify-center" role="status" aria-label="No research plan available">
                    <div>
                      <div className="text-base md:text-lg font-medium mb-2">No research plan yet</div>
                      <div className="text-sm">
                        Ask a research question in the Chat tab to generate a plan
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Report Tab */}
          {ui.active_tab === "report" && (
            <div id="report-panel" role="tabpanel" aria-labelledby="report-tab" className="h-[calc(100vh-8rem)] md:h-full">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 h-full">
                <Suspense fallback={<LoadingSkeleton />}>
                  <ReportViewer
                    report={session.current_report}
                    sessionId={session.current_session_id}
                    className="h-full"
                    onExport={handleReportExport}
                    onShare={handleReportShare}
                    isLoading={ui.loading_states.report_export || false}
                  />
                </Suspense>
              </div>
            </div>
          )}

          {/* Projects Tab */}
          {ui.active_tab === "projects" && (
            <div id="projects-panel" role="tabpanel" aria-labelledby="projects-tab" className="h-[calc(100vh-8rem)] md:h-full">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 h-full">
                <Suspense fallback={<LoadingSkeleton />}>
                  <ProjectManager className="h-full" />
                </Suspense>
              </div>
            </div>
          )}
        </main>
        
        {/* Toast Container for user feedback */}
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    </ErrorBoundary>
  );
}

export default App;