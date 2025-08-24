import React, { useState, useEffect, useCallback } from "react";

export interface OfflineState {
    isOnline: boolean;
    isOffline: boolean;
    wasOffline: boolean;
    downtime: number;
    lastOnlineTime: number | null;
    lastOfflineTime: number | null;
}

export interface OfflineDetectionOptions {
    pingUrl?: string;
    pingInterval?: number;
    pingTimeout?: number;
    onOnline?: () => void;
    onOffline?: () => void;
}

export function useOfflineDetection(options: OfflineDetectionOptions = {}) {
    const {
        pingUrl = "/api/health",
        pingInterval = 30000, // 30 seconds
        pingTimeout = 5000, // 5 seconds
        onOnline,
        onOffline,
    } = options;

    const [state, setState] = useState<OfflineState>(() => ({
        isOnline: navigator.onLine,
        isOffline: !navigator.onLine,
        wasOffline: false,
        downtime: 0,
        lastOnlineTime: navigator.onLine ? Date.now() : null,
        lastOfflineTime: navigator.onLine ? null : Date.now(),
    }));

    const [pingIntervalId, setPingIntervalId] = useState<number | null>(null);

    // Ping server to check connectivity
    const pingServer = useCallback(async (): Promise<boolean> => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), pingTimeout);

            const response = await fetch(pingUrl, {
                method: "HEAD",
                cache: "no-cache",
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            return response.ok;
        } catch (error) {
            return false;
        }
    }, [pingUrl, pingTimeout]);

    // Update online/offline state
    const updateState = useCallback((isOnline: boolean) => {
        setState((prevState) => {
            const now = Date.now();
            const wasOffline = prevState.isOffline;

            let downtime = prevState.downtime;
            if (wasOffline && isOnline && prevState.lastOfflineTime) {
                downtime = now - prevState.lastOfflineTime;
            }

            return {
                isOnline,
                isOffline: !isOnline,
                wasOffline: wasOffline && isOnline, // True only when transitioning from offline to online
                downtime,
                lastOnlineTime: isOnline ? now : prevState.lastOnlineTime,
                lastOfflineTime: !isOnline ? now : prevState.lastOfflineTime,
            };
        });
    }, []);

    // Handle browser online/offline events
    const handleOnline = useCallback(() => {
        updateState(true);
        onOnline?.();
    }, [updateState, onOnline]);

    const handleOffline = useCallback(() => {
        updateState(false);
        onOffline?.();
    }, [updateState, onOffline]);

    // Periodic connectivity check
    const startPinging = useCallback(() => {
        if (pingIntervalId) return;

        const intervalId = window.setInterval(async () => {
            const isServerReachable = await pingServer();
            const browserOnline = navigator.onLine;
            const actuallyOnline = browserOnline && isServerReachable;

            if (actuallyOnline !== state.isOnline) {
                updateState(actuallyOnline);
                if (actuallyOnline) {
                    onOnline?.();
                } else {
                    onOffline?.();
                }
            }
        }, pingInterval);

        setPingIntervalId(intervalId);
    }, [pingServer, pingInterval, state.isOnline, updateState, onOnline, onOffline, pingIntervalId]);

    const stopPinging = useCallback(() => {
        if (pingIntervalId) {
            clearInterval(pingIntervalId);
            setPingIntervalId(null);
        }
    }, [pingIntervalId]);

    // Manual connectivity check
    const checkConnectivity = useCallback(async () => {
        const isServerReachable = await pingServer();
        const browserOnline = navigator.onLine;
        const actuallyOnline = browserOnline && isServerReachable;

        updateState(actuallyOnline);
        return actuallyOnline;
    }, [pingServer, updateState]);

    // Reset offline state (useful after reconnection)
    const resetOfflineState = useCallback(() => {
        setState((prevState) => ({
            ...prevState,
            wasOffline: false,
            downtime: 0,
        }));
    }, []);

    useEffect(() => {
        // Add event listeners for browser online/offline events
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        // Start periodic connectivity checks
        startPinging();

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
            stopPinging();
        };
    }, [handleOnline, handleOffline, startPinging, stopPinging]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopPinging();
        };
    }, [stopPinging]);

    return {
        ...state,
        checkConnectivity,
        resetOfflineState,
        startPinging,
        stopPinging,
    };
}

// Utility function to format downtime
export function formatDowntime(milliseconds: number): string {
    if (milliseconds < 1000) {
        return "less than a second";
    }

    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        const remainingMinutes = minutes % 60;
        return `${hours} hour${hours > 1 ? "s" : ""}${remainingMinutes > 0 ? ` and ${remainingMinutes} minute${remainingMinutes > 1 ? "s" : ""}` : ""}`;
    }

    if (minutes > 0) {
        const remainingSeconds = seconds % 60;
        return `${minutes} minute${minutes > 1 ? "s" : ""}${remainingSeconds > 0 ? ` and ${remainingSeconds} second${remainingSeconds > 1 ? "s" : ""}` : ""}`;
    }

    return `${seconds} second${seconds > 1 ? "s" : ""}`;
}