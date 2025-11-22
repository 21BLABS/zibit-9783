import { Server as SocketIOServer } from 'socket.io';
import { orderlyMarketService } from '../services/orderlyMarketService.js';
import { chatService } from '../services/chatService.js';

export class WebSocketManager {
    private io: SocketIOServer;
    private activeSymbols: Set<string> = new Set();
    private pollIntervals: Map<string, NodeJS.Timeout> = new Map();

    constructor(io: SocketIOServer) {
        this.io = io;
        this.setupSocketHandlers();
    }

    private setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log('WebSocket client connected:', socket.id);

            // Handle symbol subscription
            socket.on('subscribe-symbol', (symbol: string) => {
                console.log(`Client ${socket.id} subscribed to ${symbol}`);
                this.subscribeToSymbol(symbol);
                socket.join(`symbol-${symbol}`);
            });

            // Handle symbol unsubscription
            socket.on('unsubscribe-symbol', (symbol: string) => {
                console.log(`Client ${socket.id} unsubscribed from ${symbol}`);
                socket.leave(`symbol-${symbol}`);
                this.unsubscribeFromSymbol(symbol);
            });

            // Handle alert subscription
            socket.on('subscribe-alerts', (wallet: string) => {
                console.log(`Client ${socket.id} subscribed to alerts for ${wallet}`);
                socket.join(`alerts-${wallet}`);
            });

            socket.on('disconnect', () => {
                console.log('WebSocket client disconnected:', socket.id);
            });
        });
    }

    private subscribeToSymbol(symbol: string) {
        if (this.activeSymbols.has(symbol)) {
            // Already subscribed
            return;
        }

        this.activeSymbols.add(symbol);

        // Start polling for this symbol
        const stopPolling = orderlyMarketService.startPolling(symbol, (data) => {
            // Broadcast price updates to all clients subscribed to this symbol
            this.io.to(`symbol-${symbol}`).emit('price-update', {
                symbol,
                data,
                timestamp: Date.now()
            });
        });

        // Generate and broadcast alerts periodically
        const alertInterval = setInterval(async () => {
            try {
                const alerts = await chatService.generateAlerts(symbol);
                if (alerts.length > 0) {
                    this.io.to(`symbol-${symbol}`).emit('alerts', {
                        symbol,
                        alerts,
                        timestamp: Date.now()
                    });
                }
            } catch (error) {
                console.error('Alert generation error:', error);
            }
        }, 30000); // Check for alerts every 30 seconds

        this.pollIntervals.set(symbol, alertInterval);
    }

    private unsubscribeFromSymbol(symbol: string) {
        // Check if any clients are still subscribed
        const symbolRoom = this.io.sockets.adapter.rooms.get(`symbol-${symbol}`);
        if (!symbolRoom || symbolRoom.size === 0) {
            // No more clients subscribed, stop polling
            this.activeSymbols.delete(symbol);
            const interval = this.pollIntervals.get(symbol);
            if (interval) {
                clearInterval(interval);
                this.pollIntervals.delete(symbol);
            }
        }
    }

    // Broadcast risk warnings to specific wallet
    broadcastRiskWarning(wallet: string, warning: any) {
        this.io.to(`alerts-${wallet}`).emit('risk-warning', {
            wallet,
            warning,
            timestamp: Date.now()
        });
    }

    // Broadcast general market alerts
    broadcastMarketAlert(symbol: string, alert: any) {
        this.io.to(`symbol-${symbol}`).emit('market-alert', {
            symbol,
            alert,
            timestamp: Date.now()
        });
    }

    // Send AI-generated alerts
    broadcastAIAlert(wallet: string, alert: string) {
        this.io.to(`alerts-${wallet}`).emit('ai-alert', {
            wallet,
            alert,
            timestamp: Date.now()
        });
    }

    // Get connection stats
    getStats() {
        return {
            activeSymbols: Array.from(this.activeSymbols),
            connectedClients: this.io.sockets.sockets.size,
            symbolSubscriptions: Array.from(this.activeSymbols).map(symbol => ({
                symbol,
                subscribers: this.io.sockets.adapter.rooms.get(`symbol-${symbol}`)?.size || 0
            }))
        };
    }
}

// Export singleton instance
let websocketManager: WebSocketManager;

export function initializeWebSocketManager(io: SocketIOServer): WebSocketManager {
    websocketManager = new WebSocketManager(io);
    return websocketManager;
}

export function getWebSocketManager(): WebSocketManager {
    if (!websocketManager) {
        throw new Error('WebSocketManager not initialized');
    }
    return websocketManager;
}
