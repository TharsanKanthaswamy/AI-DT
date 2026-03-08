'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AssetState } from './assets';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export interface RecoveryEvent {
    id: string;
    assetId: string;
    ruleType: string;
    description: string;
    diagnosis: string;
    reasoning: string;
    uphImpact: string;
    estimatedRecoverySeconds: number;
    probability: number;
    parametersBefore: Record<string, number>;
    parametersAfter: Record<string, number>;
    groqPowered: boolean;
    timestamp: number;
}

interface UseWebSocketReturn {
    assetStates: Record<string, AssetState>;
    connectionStatus: ConnectionStatus;
    sendParameterUpdate: (assetId: string, params: Record<string, number>) => void;
    dismissWarning: (assetId: string, warningId: string) => void;
    requestLogs: (assetId: string, limit?: number) => void;
    resetAll: () => void;
    logs: Record<string, unknown[]>;
    recoveryEvents: RecoveryEvent[];
    aiThinking: { assetId: string; message: string } | null;
    autoOptimizationEnabled: boolean;
    setAutoOptimization: (enabled: boolean) => void;
}

const CLIENT_TYPE = 'twin';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:3002';

export function useWebSocket(): UseWebSocketReturn {
    const [assetStates, setAssetStates] = useState<Record<string, AssetState>>({});
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
    const [logs, setLogs] = useState<Record<string, unknown[]>>({});
    const [recoveryEvents, setRecoveryEvents] = useState<RecoveryEvent[]>([]);
    const [aiThinking, setAiThinking] = useState<{ assetId: string; message: string } | null>(null);
    const [autoOptimizationEnabled, setAutoOptimizationEnabled] = useState(false);

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const mountedRef = useRef(true);
    const connectingRef = useRef(false);
    const closingIntentionallyRef = useRef(false);

    const scheduleReconnect = useCallback(() => {
        if (!mountedRef.current) return;
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);

        const delay = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 30000);
        reconnectAttemptsRef.current += 1;
        console.log(`[useWebSocket:${CLIENT_TYPE}] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);

        reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) connect();
        }, delay);
    }, []);

    const connect = useCallback(() => {
        // Reset all guards at start of fresh connection attempt
        closingIntentionallyRef.current = false;
        connectingRef.current = false;

        if (!mountedRef.current) return;
        if (
            wsRef.current?.readyState === WebSocket.OPEN ||
            wsRef.current?.readyState === WebSocket.CONNECTING
        ) return;

        console.log(`[useWebSocket:${CLIENT_TYPE}] Connecting to ${WS_URL}`);
        setConnectionStatus('connecting');

        let ws: WebSocket;
        try {
            ws = new WebSocket(WS_URL);
        } catch (err) {
            console.error(`[useWebSocket:${CLIENT_TYPE}] Failed to create WebSocket:`, err);
            scheduleReconnect();
            return;
        }

        // Capture reference BEFORE assigning to ref
        // so stale socket checks work correctly
        const thisWs = ws;
        wsRef.current = ws;

        ws.onopen = () => {
            if (wsRef.current !== thisWs) return; // stale
            if (!mountedRef.current) {
                thisWs.close();
                return;
            }
            console.log(`[useWebSocket:${CLIENT_TYPE}] Connected ✓`);
            reconnectAttemptsRef.current = 0;
            connectingRef.current = false;
            setConnectionStatus('connected');
            thisWs.send(JSON.stringify({
                type: 'REGISTER',
                clientType: CLIENT_TYPE,
            }));
        };

        ws.onmessage = (event) => {
            if (wsRef.current !== thisWs) return; // stale
            if (!mountedRef.current) return;

            let msg: { type: string;[key: string]: unknown };
            try {
                msg = JSON.parse(event.data as string);
            } catch {
                return;
            }

            switch (msg.type) {
                case 'INITIAL_STATE': {
                    setAssetStates(msg.states as Record<string, AssetState>);
                    break;
                }
                case 'STATE_UPDATE': {
                    const { assetId, state } = msg as unknown as { assetId: string; state: AssetState };
                    setAssetStates(prev => ({ ...prev, [assetId]: state }));
                    break;
                }
                case 'WARNING_DISMISSED': {
                    const { assetId, warningId } = msg as unknown as { assetId: string; warningId: string };
                    setAssetStates(prev => {
                        const asset = prev[assetId];
                        if (!asset) return prev;
                        return {
                            ...prev,
                            [assetId]: {
                                ...asset,
                                activeWarnings: asset.activeWarnings.filter(w => w.id !== warningId),
                            },
                        };
                    });
                    break;
                }
                case 'WARNING_RESOLVED': {
                    const { assetId, warningType } = msg as unknown as { assetId: string; warningType: string };
                    setAssetStates(prev => {
                        const asset = prev[assetId];
                        if (!asset) return prev;
                        return {
                            ...prev,
                            [assetId]: {
                                ...asset,
                                activeWarnings: asset.activeWarnings.filter(w => w.type !== warningType),
                            },
                        };
                    });
                    break;
                }
                case 'LOGS_RESPONSE': {
                    const { assetId, logs: assetLogs } = msg as unknown as { assetId: string; logs: unknown[] };
                    setLogs(prev => ({ ...prev, [assetId]: assetLogs }));
                    break;
                }
                case 'RECOVERY_ACTION': {
                    const recovery = msg as unknown as RecoveryEvent;
                    setRecoveryEvents(prev => [
                        { ...recovery, id: `${recovery.assetId}-${recovery.timestamp}` },
                        ...prev.slice(0, 19),
                    ]);
                    break;
                }
                case 'AI_THINKING': {
                    const { assetId, message } = msg as unknown as { assetId: string; message: string };
                    setAiThinking({ assetId, message });
                    setTimeout(() => setAiThinking(null), 8000);
                    break;
                }
                case 'AUTO_OPTIMIZATION_STATE': {
                    const { enabled } = msg as unknown as { enabled: boolean };
                    setAutoOptimizationEnabled(enabled);
                    break;
                }
            }
        };

        ws.onerror = () => {
            // Only log if this is the current active socket AND
            // we are not in the middle of an intentional close
            if (wsRef.current !== thisWs) return;
            if (closingIntentionallyRef.current) return;
            if (!mountedRef.current) return;
            console.error(
                `[useWebSocket:${CLIENT_TYPE}] Connection failed. ` +
                `WS server may not be running at ${WS_URL}`
            );
        };

        ws.onclose = (event) => {
            if (wsRef.current !== thisWs) return; // stale socket, ignore
            if (!mountedRef.current) return;

            console.log(
                `[useWebSocket:${CLIENT_TYPE}] Closed. Code: ${event.code}, ` +
                `Clean: ${event.wasClean}`
            );

            connectingRef.current = false;
            wsRef.current = null;
            setConnectionStatus('disconnected');

            if (!closingIntentionallyRef.current) {
                scheduleReconnect();
            }
        };
    }, [scheduleReconnect]);

    // Cleanup
    useEffect(() => {
        mountedRef.current = true;
        connect();

        return () => {
            mountedRef.current = false;
            closingIntentionallyRef.current = true;
            connectingRef.current = false;

            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }

            if (wsRef.current) {
                // Null ALL handlers before close — no callbacks fire
                wsRef.current.onopen = null;
                wsRef.current.onmessage = null;
                wsRef.current.onerror = null;
                wsRef.current.onclose = null;
                wsRef.current.close(1000, 'Component unmounting');
                wsRef.current = null;
            }
        };
    }, [connect]);

    const sendParameterUpdate = useCallback((assetId: string, params: Record<string, number>) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'PARAMETER_UPDATE',
                assetId,
                params,
            }));
        }
    }, []);

    const dismissWarning = useCallback((assetId: string, warningId: string) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'DISMISS_WARNING',
                assetId,
                warningId,
            }));
        }
    }, []);

    const requestLogs = useCallback((assetId: string, limit = 100) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'GET_LOGS',
                assetId,
                limit,
            }));
        }
    }, []);

    const resetAll = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'RESET_ALL' }));
        }
    }, []);

    const setAutoOptimization = useCallback((enabled: boolean) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'SET_AUTO_OPTIMIZATION',
                enabled,
            }));
        }
    }, []);

    return {
        assetStates,
        connectionStatus,
        sendParameterUpdate,
        dismissWarning,
        requestLogs,
        resetAll,
        logs,
        recoveryEvents,
        aiThinking,
        autoOptimizationEnabled,
        setAutoOptimization,
    };
}
