import type { WebSocketMessage, WebSocketMessageType } from "../types/index.ts";
import { retry, retryConfigs, CircuitBreaker } from "./retry.ts";

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error"
  | "reconnecting";

export interface WebSocketManagerOptions {
  url: string;
  maxReconnectAttempts?: number;
  initialReconnectDelay?: number;
  maxReconnectDelay?: number;
  reconnectBackoffFactor?: number;
  heartbeatInterval?: number;
  connectionTimeout?: number;
}

export interface WebSocketManagerEvents {
  onMessage: (message: WebSocketMessage) => void;
  onStatusChange: (status: ConnectionStatus) => void;
  onError: (error: Error) => void;
  onReconnectAttempt: (attempt: number, maxAttempts: number) => void;
}

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private options: Required<WebSocketManagerOptions>;
  private events: WebSocketManagerEvents;
  private status: ConnectionStatus = "disconnected";
  private reconnectAttempts = 0;
  private reconnectTimeoutId: number | null = null;
  private heartbeatIntervalId: number | null = null;
  private connectionTimeoutId: number | null = null;
  private lastPingTime: number | null = null;
  private isManualDisconnect = false;

  constructor(options: WebSocketManagerOptions, events: WebSocketManagerEvents) {
    this.options = {
      maxReconnectAttempts: 5,
      initialReconnectDelay: 1000,
      maxReconnectDelay: 30000,
      reconnectBackoffFactor: 2,
      heartbeatInterval: 30000,
      connectionTimeout: 10000,
      ...options,
    };
    this.events = events;
  }

  /**
   * Connect to the WebSocket server
   */
  public connect(): void {
    if (this.status === "connected" || this.status === "connecting") {
      return;
    }

    this.isManualDisconnect = false;
    this.setStatus("connecting");
    this.createConnection();
  }

  /**
   * Disconnect from the WebSocket server
   */
  public disconnect(): void {
    this.isManualDisconnect = true;
    this.cleanup();
    this.setStatus("disconnected");
  }

  /**
   * Send a message through the WebSocket connection
   */
  public send(message: any): boolean {
    if (this.status !== "connected" || !this.ws) {
      console.warn("WebSocket not connected, cannot send message:", message);
      return false;
    }

    try {
      const messageString = typeof message === "string" ? message : JSON.stringify(message);
      this.ws.send(messageString);
      return true;
    } catch (error) {
      console.error("Failed to send WebSocket message:", error);
      this.events.onError(error instanceof Error ? error : new Error("Failed to send message"));
      return false;
    }
  }

  /**
   * Get current connection status
   */
  public getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Check if WebSocket is connected
   */
  public isConnected(): boolean {
    return this.status === "connected";
  }

  /**
   * Create a new WebSocket connection
   */
  private createConnection(): void {
    try {
      this.ws = new WebSocket(this.options.url);
      this.setupEventListeners();
      this.startConnectionTimeout();
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
      this.handleConnectionError(error instanceof Error ? error : new Error("Connection failed"));
    }
  }

  /**
   * Set up WebSocket event listeners
   */
  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = this.handleOpen.bind(this);
    this.ws.onmessage = this.handleMessage.bind(this);
    this.ws.onclose = this.handleClose.bind(this);
    this.ws.onerror = this.handleError.bind(this);
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen(): void {
    console.log("WebSocket connection established");
    this.clearConnectionTimeout();
    this.setStatus("connected");
    this.reconnectAttempts = 0;
    this.startHeartbeat();
  }

  /**
   * Handle WebSocket message event
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message = this.parseMessage(event.data);
      if (message) {
        // Handle heartbeat/ping responses
        if (message.type === "connection_established") {
          this.lastPingTime = Date.now();
        }

        this.events.onMessage(message);
      }
    } catch (error) {
      console.error("Failed to parse WebSocket message:", error);
      this.events.onError(error instanceof Error ? error : new Error("Message parsing failed"));
    }
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(event: CloseEvent): void {
    console.log("WebSocket connection closed:", event.code, event.reason);
    this.cleanup();

    if (!this.isManualDisconnect) {
      this.setStatus("reconnecting");
      this.scheduleReconnect();
    } else {
      this.setStatus("disconnected");
    }
  }

  /**
   * Handle WebSocket error event
   */
  private handleError(event: Event): void {
    console.error("WebSocket error:", event);
    const error = new Error("WebSocket connection error");
    this.handleConnectionError(error);
  }

  /**
   * Handle connection errors
   */
  private handleConnectionError(error: Error): void {
    this.cleanup();
    this.setStatus("error");
    this.events.onError(error);

    if (!this.isManualDisconnect) {
      this.scheduleReconnect();
    }
  }

  /**
   * Parse incoming WebSocket message
   */
  private parseMessage(data: string): WebSocketMessage | null {
    try {
      const parsed = JSON.parse(data);

      // Validate message structure
      if (!this.isValidWebSocketMessage(parsed)) {
        throw new Error("Invalid message format");
      }

      return parsed as WebSocketMessage;
    } catch (error) {
      console.error("Failed to parse message:", error, "Raw data:", data);
      return null;
    }
  }

  /**
   * Validate WebSocket message structure
   */
  private isValidWebSocketMessage(message: any): boolean {
    return (
      message &&
      typeof message === "object" &&
      typeof message.type === "string" &&
      typeof message.timestamp === "string"
    );
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      this.setStatus("error");
      this.events.onError(new Error("Max reconnection attempts exceeded"));
      return;
    }

    const delay = Math.min(
      this.options.initialReconnectDelay *
        Math.pow(this.options.reconnectBackoffFactor, this.reconnectAttempts),
      this.options.maxReconnectDelay,
    );

    this.reconnectAttempts++;
    this.events.onReconnectAttempt(this.reconnectAttempts, this.options.maxReconnectAttempts);

    console.log(
      `Scheduling reconnection attempt ${this.reconnectAttempts}/${this.options.maxReconnectAttempts} in ${delay}ms`,
    );

    this.reconnectTimeoutId = setTimeout(() => {
      if (!this.isManualDisconnect) {
        this.setStatus("connecting");
        this.createConnection();
      }
    }, delay);
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    this.heartbeatIntervalId = setInterval(() => {
      if (this.status === "connected") {
        // Send a ping or check connection health
        // For now, we'll just track the last ping time
        this.lastPingTime = Date.now();
      }
    }, this.options.heartbeatInterval);
  }

  /**
   * Start connection timeout
   */
  private startConnectionTimeout(): void {
    this.connectionTimeoutId = setTimeout(() => {
      if (this.status === "connecting") {
        console.error("Connection timeout");
        this.handleConnectionError(new Error("Connection timeout"));
      }
    }, this.options.connectionTimeout);
  }

  /**
   * Clear connection timeout
   */
  private clearConnectionTimeout(): void {
    if (this.connectionTimeoutId) {
      clearTimeout(this.connectionTimeoutId);
      this.connectionTimeoutId = null;
    }
  }

  /**
   * Set connection status and notify listeners
   */
  private setStatus(status: ConnectionStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.events.onStatusChange(status);
    }
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    // Clear timeouts
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }

    this.clearConnectionTimeout();

    // Close WebSocket connection
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;

      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }

      this.ws = null;
    }
  }

  /**
   * Get connection statistics
   */
  public getConnectionStats() {
    return {
      status: this.status,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.options.maxReconnectAttempts,
      lastPingTime: this.lastPingTime,
      isConnected: this.isConnected(),
    };
  }
}
