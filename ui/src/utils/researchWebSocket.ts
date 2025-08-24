/**
 * Research WebSocket utility for handling streaming research events
 * 
 * Example usage:
 * 
 * ```typescript
 * const researchWS = new ResearchWebSocketClient('ws://localhost:8000/research/session123');
 * 
 * researchWS.onProgress = (event) => {
 *   console.log(`Progress: ${event.message} (${event.progress}%)`);
 *   updateProgressBar(event.progress);
 * };
 * 
 * researchWS.onFinalResult = (event) => {
 *   console.log('Research completed!', event.result);
 *   displayFinalResults(event.result);
 * };
 * 
 * researchWS.onError = (event) => {
 *   console.error('Research error:', event.message);
 *   showErrorMessage(event.message);
 * };
 * 
 * // Start research
 * const config = { research_jobs: [{ research_tasks: ['task1', 'task2'] }] };
 * researchWS.startResearch(config);
 * ```
 */

import {
  ResearchWebSocketEvent,
  ResearchWebSocketHandlers,
  ResearchProgressEvent,
  ResearchFinalResultEvent,
  ResearchErrorEvent,
  ParallelResearchConfig,
  isResearchProgressEvent,
  isResearchFinalResultEvent,
  isResearchErrorEvent
} from '../types/index.ts';

export class ResearchWebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 1000;

  // Event handlers
  public onProgress?: (event: ResearchProgressEvent) => void;
  public onFinalResult?: (event: ResearchFinalResultEvent) => void;
  public onError?: (event: ResearchErrorEvent) => void;
  public onConnectionOpen?: () => void;
  public onConnectionClose?: () => void;
  public onConnectionError?: (error: Event) => void;

  constructor(url: string, handlers?: ResearchWebSocketHandlers) {
    this.url = url;
    if (handlers) {
      this.onProgress = handlers.onProgress;
      this.onFinalResult = handlers.onFinalResult;
      this.onError = handlers.onError;
    }
  }

  /**
   * Connect to the WebSocket server
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('Research WebSocket connected');
          this.reconnectAttempts = 0;
          this.onConnectionOpen?.();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data: ResearchWebSocketEvent = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = () => {
          console.log('Research WebSocket disconnected');
          this.onConnectionClose?.();
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('Research WebSocket error:', error);
          this.onConnectionError?.(error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Start research with the given configuration
   */
  public startResearch(config: ParallelResearchConfig): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    this.ws.send(JSON.stringify(config));
  }

  /**
   * Close the WebSocket connection
   */
  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(event: ResearchWebSocketEvent): void {
    if (isResearchProgressEvent(event)) {
      this.onProgress?.(event);
    } else if (isResearchFinalResultEvent(event)) {
      this.onFinalResult?.(event);
    } else if (isResearchErrorEvent(event)) {
      this.onError?.(event);
    }
  }

  /**
   * Attempt to reconnect to the WebSocket
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connect().catch((error) => {
          console.error('Reconnection failed:', error);
        });
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  /**
   * Get the current connection state
   */
  public get connectionState(): string {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'closed';
      default: return 'unknown';
    }
  }
}

/**
 * React hook for using the Research WebSocket client
 */
export const useResearchWebSocket = (url: string, handlers?: ResearchWebSocketHandlers) => {
  const client = new ResearchWebSocketClient(url, handlers);
  
  return {
    client,
    connect: () => client.connect(),
    startResearch: (config: ParallelResearchConfig) => client.startResearch(config),
    disconnect: () => client.disconnect(),
    connectionState: client.connectionState
  };
};
