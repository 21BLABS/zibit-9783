import { createContext, ReactNode, useContext, useEffect, useState, useCallback } from 'react';
import { API } from '@orderly.network/types';

interface AIContextValue {
    account: {
        address?: string;
        isLoggedIn: boolean;
    } | null;
    positions: API.PositionInfo[] | null;
    symbol: string | null;
    isLoggedIn: boolean;
    alerts: Array<{ id: string; message: string; timestamp: number; type: 'info' | 'warning' | 'success' }>;
    clearAlerts: () => void;
}

const AIContext = createContext<AIContextValue | null>(null);

interface AIProviderProps {
    children: ReactNode;
    symbol: string;
    account?: {
        address?: string;
        isLoggedIn: boolean;
    } | null;
    positions?: API.PositionInfo[] | null;
}

export function AIProvider({ children, symbol, account, positions }: AIProviderProps) {
    const [alerts, setAlerts] = useState<Array<{ id: string; message: string; timestamp: number; type: 'info' | 'warning' | 'success' }>>([]);

    const clearAlerts = useCallback(() => {
        setAlerts([]);
    }, []);

    const addAlert = useCallback((message: string, type: 'info' | 'warning' | 'success' = 'info') => {
        const alert = {
            id: `alert-${Date.now()}`,
            message,
            timestamp: Date.now(),
            type
        };
        setAlerts(prev => [...prev.slice(-4), alert]); // Keep last 5 alerts
    }, []);

    // WebSocket connection for real-time updates
    useEffect(() => {
        let socket: any = null;

        const connectWebSocket = async () => {
            try {
                // Dynamic import to avoid SSR issues
                const { io } = await import('socket.io-client');

                const backendUrl = process.env.NODE_ENV === 'production'
                    ? window.location.origin.replace('5173', '3001')
                    : 'http://localhost:3001';

                socket = io(backendUrl, {
                    transports: ['websocket', 'polling']
                });

                socket.on('connect', () => {
                    console.log('Socket.IO connected to AI backend');

                    // Subscribe to symbol updates
                    socket.emit('subscribe-symbol', symbol);

                    // Subscribe to alerts if user is logged in
                    if (account?.address) {
                        socket.emit('subscribe-alerts', account.address);
                    }
                });

                socket.on('price-update', (data: any) => {
                    console.log('Price update received:', data);
                    // Could update price context here if needed
                });

                socket.on('alerts', (data: any) => {
                    if (data.alerts && Array.isArray(data.alerts)) {
                        data.alerts.forEach((alert: string) => {
                            addAlert(` ${symbol}: ${alert}`, 'info');
                        });
                    }
                });

                socket.on('ai-alert', (data: any) => {
                    addAlert(` ${data.alert}`, 'success');
                });

                socket.on('risk-warning', (data: any) => {
                    addAlert(` ${data.warning}`, 'warning');
                });

                socket.on('disconnect', () => {
                    console.log('Socket.IO disconnected');
                });

                socket.on('connect_error', (error: any) => {
                    console.error('Socket.IO connection error:', error);
                });

            } catch (error) {
                console.error('Socket.IO connection failed:', error);
            }
        };

        // Only connect in browser environment
        if (typeof window !== 'undefined') {
            connectWebSocket();
        }

        return () => {
            if (socket) {
                socket.disconnect();
            }
        };
    }, [symbol, account?.address, addAlert]);

    const value: AIContextValue = {
        account: account || null,
        positions: positions || null,
        symbol,
        isLoggedIn: account?.isLoggedIn || false,
        alerts,
        clearAlerts,
    };

    return (
        <AIContext.Provider value={value}>
            {children}
        </AIContext.Provider>
    );
}

export function useAIContext() {
    const context = useContext(AIContext);
    if (!context) {
        throw new Error('useAIContext must be used within an AIProvider');
    }
    return context;
}
