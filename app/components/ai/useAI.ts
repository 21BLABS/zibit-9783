import { useState, useCallback } from 'react';
import { AIMessage } from './types';
import { useAIContext } from './AIProvider';

const mockMessages: AIMessage[] = [
    {
        id: '1',
        role: 'assistant',
        content: 'Welcome to Zibit AI',
        timestamp: Date.now() - 2000,
    },
    {
        id: '2',
        role: 'assistant',
        content: 'Select any pair to start analysis',
        timestamp: Date.now() - 1000,
    },
];

export function useAI(symbol?: string) {
    const context = useAIContext();
    const [messages, setMessages] = useState<AIMessage[]>(mockMessages);
    const [isLoading, setIsLoading] = useState(false);

    const sendMessage = useCallback(async (content: string) => {
        const userMessage: AIMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content,
            timestamp: Date.now(),
        };

        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);

        try {
            // Call backend AI API
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: content,
                    wallet: context.account?.address || 'demo-wallet',
                    symbol: context.symbol || symbol || 'PERP_ETH_USDC',
                }),
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            const data = await response.json();

            const aiResponse: AIMessage = {
                id: `ai-${Date.now()}`,
                role: 'assistant',
                content: data.reply,
                timestamp: Date.now(),
            };

            setMessages(prev => [...prev, aiResponse]);
        } catch (error) {
            console.error('AI API error:', error);

            // Fallback response
            const fallbackResponse: AIMessage = {
                id: `ai-${Date.now()}`,
                role: 'assistant',
                content: `I apologize, but I'm having trouble connecting to the AI service right now. Your question about ${context.symbol || symbol || 'the market'} has been noted. Please try again in a moment.`,
                timestamp: Date.now(),
            };

            setMessages(prev => [...prev, fallbackResponse]);
        } finally {
            setIsLoading(false);
        }
    }, [context]);

    return {
        messages,
        isLoading,
        sendMessage,
    };
}
