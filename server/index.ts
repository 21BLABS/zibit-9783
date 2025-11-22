import dotenv from 'dotenv';

// Load environment variables FIRST before any other imports
dotenv.config();

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import aiRoutes from './routes/ai.js';
import marketRoutes from './routes/market.js';
import positionRoutes from './routes/positions.js';
import { initializeWebSocketManager } from './utils/websocketManager.js';

// Debug environment variables
console.log('🔧 Environment Variables Debug:');
console.log('ORDERLY_BASE_URL:', process.env.ORDERLY_BASE_URL);
console.log('ORDERLY_KEY exists:', !!process.env.ORDERLY_KEY);
console.log('ORDERLY_SECRET exists:', !!process.env.ORDERLY_SECRET);
console.log('ORDERLY_ACCOUNT_ID exists:', !!process.env.ORDERLY_ACCOUNT_ID);

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/ai', aiRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/positions', positionRoutes);

// Initialize WebSocket Manager
initializeWebSocketManager(io);

// WebSocket connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Export io for use in other modules
export { io };

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
    console.log(`🚀 Zibit AI Backend running on port ${PORT}`);
    console.log(`📊 WebSocket server ready for real-time updates`);
});

export default app;
