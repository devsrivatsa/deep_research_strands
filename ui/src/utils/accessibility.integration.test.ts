import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ErrorBoundary } from "../components/ErrorBoundary.tsx";
import { ToastContainer, useToast } from "../components/Toast.tsx";
import { useOfflineDetection } from "../hooks/useOfflineDetection.ts";
import { APIClient } from "./APIClient.ts";
import { retry, retryConfigs } from "./retry.ts";

// Mock fetch for API tests
global.fetch = jest.fn();

// Integration test component that combines error handling features
function IntegratedErrorHandlingApp() {
  const { toasts, error, success, warning, dismissToast } = useToast();
  const offline = useOfflineDetection({
    onOffline: () => error("Connection Lost", "You are now offline. Some features may not work."),
    onOnline: () => success("Connection Restored", "You are back online!"),
  });

  const [apiClient] = React.useState(() => new APIClient());
  const [isLoading, setIsLoading] = React.useState(false);

  const handleApiCall = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.getHealth();
      if (response.success) {
        success("API Call Successful", "Health check completed");
      } else {
        error("API Call Failed", response.error?.message || "Unknown error");
      }
    } catch (err) {
      error("API Call Error", err instanceof Error ? err.message : "Network error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetryOperation = async () => {
    setIsLoading(true);
    try {
      const result = await retry(
        async () => {
          const response = await fetch("/api/test");
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          return response.json();
        },
        {
          ...retryConfigs.api,
          onRetry: (error, attempt) => {
            warning(`Retry Attempt ${attempt}`, `Retrying due to: ${error.message}`);
          },
        }
      );
      success("Retry Successful", "Operation completed after retries");
    } catch (err) {
      error("Retry Failed", "All retry attempts exhausted");
    } finally {
      setIsLoading(false);
    }
  };

  const ThrowErrorComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
    if (shouldThrow) {
      throw new Error("Intentional test error");
    }
    return <div>No error thrown</div>;
  };

  const [shouldThrowError, setShouldThrowError] = React.useState(false);

  return (
    <div className="p-4">
      <h1>Error Handling Integration Test</h1>
      
      {/* Connection Status */}
      <div className="mb-4">
        <h2>Connection Status</h2>
        <div data-testid="connection-status">
          Status: {offline.isOnline ? "Online" : "Offline"}
          {offline.wasOffline && (
            <span data-testid="downtime">
              (Was offline for {offline.downtime}ms)
            </span>
          )}
        </div>
        <button onClick={offline.checkConnectivity}>Check Connectivity</button>
      </div>

      {/* API Operations */}
      <div className="mb-4">
        <h2>API Operations</h2>
        <button onClick={handleApiCall} disabled={isLoading}>
          {isLoading ? "Loading..." : "Make API Call"}
        </button>
        <button onClick={handleRetryOperation} disabled={isLoading}>
          {isLoading ? "Retrying..." : "Retry Operation"}
        </button>
      </div>

      {/* Error Boundary Test */}
      <div className="mb-4">
        <h2>Error Boundary Test</h2>
        <button onClick={() => setShouldThrowError(!shouldThrowError)}>
          {shouldThrowError ? "Fix Error" : "Trigger Error"}
        </button>
        <ErrorBoundary
          onError={(error, errorInfo) => {
            error("Component Error", `Error in component: ${error.message}`);
          }}
        >
          <ThrowErrorComponent shouldThrow={shouldThrowError} />
        </ErrorBoundary>
      </div>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

describe("Error Handling Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { status: "healthy" } }),
    });
    
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    // Clean up any toast containers
    const container = document.getElementById("toast-container");
    if (container) {
      document.body.removeChild(container);
    }
  });

  it("handles successful API calls with success toast", async () => {
    render(<IntegratedErrorHandlingApp />);

    fireEvent.click(screen.getByText("Make API Call"));

    await waitFor(() => {
      expect(screen.getByText("API Call Successful")).toBeInTheDocument();
      expect(screen.getByText("Health check completed")).toBeInTheDocument();
    });
  });

  it("handles API failures with error toast", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({
        success: false,
        error: { message: "Internal Server Error" }
      }),
    });

    render(<IntegratedErrorHandlingApp />);

    fireEvent.click(screen.getByText("Make API Call"));

    await waitFor(() => {
      expect(screen.getByText("API Call Failed")).toBeInTheDocument();
      expect(screen.getByText("Internal Server Error")).toBeInTheDocument();
    });
  });

  it("handles network errors with retry mechanism", async () => {
    // First two calls fail, third succeeds
    (fetch as jest.Mock)
      .mockRejectedValueOnce(new Error("Network error"))
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: "success" }),
      });

    render(<IntegratedErrorHandlingApp />);

    fireEvent.click(screen.getByText("Retry Operation"));

    // Should see retry attempt warnings
    await waitFor(() => {
      expect(screen.getByText("Retry Attempt 1")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText("Retry Attempt 2")).toBeInTheDocument();
    });

    // Eventually should succeed
    await waitFor(() => {
      expect(screen.getByText("Retry Successful")).toBeInTheDocument();
    });
  });

  it("handles component errors with error boundary", async () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();

    render(<IntegratedErrorHandlingApp />);

    // Initially no error
    expect(screen.getByText("No error thrown")).toBeInTheDocument();

    // Trigger error
    fireEvent.click(screen.getByText("Trigger Error"));

    // Should show error boundary UI
    await waitFor(() => {
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });

    // Should also show error toast
    await waitFor(() => {
      expect(screen.getByText("Component Error")).toBeInTheDocument();
    });

    console.error = originalError;
  });

  it("handles offline/online transitions", async () => {
    render(<IntegratedErrorHandlingApp />);

    // Initially online
    expect(screen.getByTestId("connection-status")).toHaveTextContent("Online");

    // Simulate going offline
    fireEvent(window, new Event('offline'));
    Object.defineProperty(navigator, 'onLine', { value: false });

    await waitFor(() => {
      expect(screen.getByText("Connection Lost")).toBeInTheDocument();
      expect(screen.getByTestId("connection-status")).toHaveTextContent("Offline");
    });

    // Simulate going back online
    fireEvent(window, new Event('online'));
    Object.defineProperty(navigator, 'onLine', { value: true });

    await waitFor(() => {
      expect(screen.getByText("Connection Restored")).toBeInTheDocument();
      expect(screen.getByTestId("connection-status")).toHaveTextContent("Online");
    });
  });

  it("handles manual connectivity check", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

    render(<IntegratedErrorHandlingApp />);

    fireEvent.click(screen.getByText("Check Connectivity"));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/health", {
        method: "HEAD",
        cache: "no-cache",
        signal: expect.any(AbortSignal),
      });
    });
  });

  it("shows multiple error types simultaneously", async () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();

    (fetch as jest.Mock).mockRejectedValue(new Error("Network failure"));

    render(<IntegratedErrorHandlingApp />);

    // Trigger multiple errors
    fireEvent.click(screen.getByText("Make API Call"));
    fireEvent.click(screen.getByText("Trigger Error"));

    // Should show both error types
    await waitFor(() => {
      expect(screen.getByText("API Call Error")).toBeInTheDocument();
      expect(screen.getByText("Component Error")).toBeInTheDocument();
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });

    console.error = originalError;
  });

  it("handles toast dismissal", async () => {
    render(<IntegratedErrorHandlingApp />);

    fireEvent.click(screen.getByText("Make API Call"));

    await waitFor(() => {
      expect(screen.getByText("API Call Successful")).toBeInTheDocument();
    });

    // Dismiss the toast
    const dismissButton = screen.getByLabelText("Dismiss notification");
    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(screen.queryByText("API Call Successful")).not.toBeInTheDocument();
    });
  });

  it("handles loading states correctly", async () => {
    // Make fetch hang to test loading state
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(<IntegratedErrorHandlingApp />);

    fireEvent.click(screen.getByText("Make API Call"));

    // Should show loading state
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.getByText("Loading...")).toBeDisabled();
  });
});