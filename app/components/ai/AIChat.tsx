import React, { useState, useRef, useCallback, useEffect } from 'react';
import { AIMessage } from './types';
import { useAI } from './useAI';
import { useAIContext } from './AIProvider';

interface AIChatProps {
    symbol?: string;
}

export function AIChat({ symbol }: AIChatProps) {
    const { messages, isLoading, sendMessage } = useAI(symbol);
    const context = useAIContext();

    // Debug logging
    console.log('AI Context:', context);
    console.log('AI Context account:', context.account);
    console.log('AI Context symbol:', context.symbol);
    console.log('AI Context isLoggedIn:', context.isLoggedIn);
    const [input, setInput] = useState('');
    const [isMinimized, setIsMinimized] = useState(false);
    const [position, setPosition] = useState({ x: window.innerWidth - 380, y: 20 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const chatRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (chatRef.current) {
            setIsDragging(true);
            const rect = chatRef.current.getBoundingClientRect();
            setDragOffset({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            });
        }
    }, []);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (isDragging) {
            const newX = Math.max(0, Math.min(window.innerWidth - 360, e.clientX - dragOffset.x));
            const newY = Math.max(0, Math.min(window.innerHeight - (isMinimized ? 60 : 600), e.clientY - dragOffset.y));
            setPosition({ x: newX, y: newY });
        }
    }, [isDragging, dragOffset.x, dragOffset.y, isMinimized]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Add global mouse event listeners for dragging
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isLoading) {
            sendMessage(input.trim());
            setInput('');
        }
    };

    const truncateAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    return (
        <div
            ref={chatRef}
            className={`fixed z-50 bg-neutral-900 text-white rounded-lg shadow-2xl border border-neutral-700 overflow-hidden ${isMinimized ? 'w-[360px] h-[60px]' : 'w-[360px] h-[600px]'
                }`}
            style={{
                left: position.x,
                top: position.y,
                cursor: isDragging ? 'grabbing' : 'default',
            }}
        >
            {/* Draggable Header */}
            <div
                className="flex items-center justify-between p-3 bg-neutral-800 border-b border-neutral-700 cursor-grab active:cursor-grabbing"
                onMouseDown={handleMouseDown}
            >
                <h2 className="text-sm font-semibold">Zibit AI</h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="w-6 h-6 rounded hover:bg-neutral-700 flex items-center justify-center text-xs"
                        title={isMinimized ? 'Maximize' : 'Minimize'}
                    >
                        {isMinimized ? '⬆' : '⬇'}
                    </button>
                    <div className="w-2 h-2 bg-green-500 rounded-full" title="Online"></div>
                </div>
            </div>

            {!isMinimized && (
                <>
                    {/* Context Header */}
                    <div className="px-4 py-2 bg-neutral-800 border-b border-neutral-700 text-xs">
                        <div className="space-y-1">
                            <div className="flex justify-between items-center">
                                <span className="text-neutral-400">Symbol:</span>
                                <span className="font-mono text-neutral-200">{context.symbol || 'None'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-neutral-400">Account:</span>
                                <span className="font-mono text-neutral-200">
                                    {context.account?.address ? truncateAddress(context.account.address) : 'Not connected'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-neutral-400">Status:</span>
                                <span className={`font-mono text-xs px-2 py-1 rounded ${context.isLoggedIn ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                                    }`}>
                                    {context.isLoggedIn ? 'Connected' : 'Disconnected'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-neutral-400">Positions:</span>
                                <span className="font-mono text-neutral-200">
                                    {context.positions ? context.positions.length : 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Real-time Alerts */}
                    {context.alerts.length > 0 && (
                        <div className="px-4 py-2 border-b border-neutral-700">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-neutral-300">Live Alerts</span>
                                <button
                                    onClick={context.clearAlerts}
                                    className="text-xs text-neutral-400 hover:text-neutral-200"
                                >
                                    Clear
                                </button>
                            </div>
                            <div className="space-y-1 max-h-20 overflow-y-auto">
                                {context.alerts.slice(-3).reverse().map((alert) => (
                                    <div
                                        key={alert.id}
                                        className={`text-xs p-2 rounded ${alert.type === 'warning' ? 'bg-red-900/30 text-red-200 border border-red-700/50' :
                                            alert.type === 'success' ? 'bg-green-900/30 text-green-200 border border-green-700/50' :
                                                'bg-blue-900/30 text-blue-200 border border-blue-700/50'
                                            }`}
                                    >
                                        {alert.message}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Header */}
                    <div className="p-4 border-b border-neutral-800">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm text-neutral-400">
                                {symbol ? `Analyzing ${symbol}` : 'Select a pair to start'}
                            </p>
                            <div className="flex items-center space-x-2">
                                <span className={`text-xs px-2 py-1 rounded ${context.isLoggedIn ? 'bg-green-900/30 text-green-300' : 'bg-yellow-900/30 text-yellow-300'
                                    }`}>
                                    {context.isLoggedIn ? '✓ Connected' : 'Demo Mode'}
                                </span>
                            </div>
                        </div>

                        {/* Real-time market indicators */}
                        {symbol && (
                            <div className="text-xs text-neutral-500 space-y-1">
                                <div className="flex items-center justify-between">
                                    <span>Data Source:</span>
                                    <span className="text-green-400">LIVE Orderly Network API ✓</span>
                                </div>
                                <div className="text-neutral-600">
                                    Real-time technical analysis • 2s updates • AI-powered insights
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[400px]">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'
                                    }`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-lg px-3 py-2 ${message.role === 'user'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-neutral-800 text-neutral-200'
                                        }`}
                                >
                                    <p className="text-sm">{message.content}</p>
                                    <p className="text-xs text-neutral-400 mt-1">
                                        {new Date(message.timestamp).toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-neutral-800 text-neutral-200 rounded-lg px-3 py-2">
                                    <p className="text-sm">Thinking...</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t border-neutral-800">
                        <form onSubmit={handleSubmit} className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask about the market..."
                                className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:border-blue-500 text-sm"
                                disabled={isLoading}
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !input.trim()}
                                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-600 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors text-sm"
                            >
                                Send
                            </button>
                        </form>
                    </div>
                </>
            )}

            {/* Minimized Content */}
            {isMinimized && (
                <div className="p-3 text-sm text-neutral-400">
                    Click header to drag • Click ⬆ to expand
                </div>
            )}
        </div>
    );
}
