import express from 'express';
import { chatService } from '../services/chatService.js';

const router = express.Router();

router.post('/chat', async (req, res) => {
    try {
        const { message, wallet, symbol } = req.body;

        if (!message || !wallet || !symbol) {
            return res.status(400).json({
                error: 'Missing required fields: message, wallet, symbol'
            });
        }

        const response = await chatService.processMessage(message, wallet, symbol);

        res.json(response);
    } catch (error) {
        console.error('AI Chat error:', error);
        res.status(500).json({
            error: 'Failed to process AI chat request',
            reply: 'Sorry, I encountered an error. Please try again.'
        });
    }
});

export default router;
