import OpenAI from 'openai';
import { orderlyMarketService } from './orderlyMarketService.js';
import { technicalAnalysisService } from './technicalAnalysisService.js';

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key',
});

export class ChatService {

    async processMessage(message: string, wallet: string, symbol: string): Promise<{
        reply: string;
        indicators: {
            rsi: number;
            macd: { macd: number, signal: number, histogram: number };
            ema20: number;
            ema50: number;
        };
        price: number;
    }> {
        try {
            // Fetch real market data and indicators
            const [marketData, indicators] = await Promise.all([
                orderlyMarketService.getMarketData(symbol),
                technicalAnalysisService.getAllIndicators(symbol)
            ]);

            // Calculate orderbook imbalance
            const orderbookImbalance = this.calculateOrderbookImbalance(marketData.orderbook);

            // Create AI prompt with real market context
            const systemPrompt = `You are Zibit's advanced trading AI assistant. Analyze the provided REAL market data and give professional trading insights.

Current REAL Market Data for ${symbol}:
- Price: $${marketData.price.toFixed(4)}
- 24h Change: ${marketData.change24h.toFixed(2)}%
- 24h Volume: $${marketData.volume24h.toLocaleString()}
- 24h High: $${marketData.high.toFixed(4)}
- 24h Low: $${marketData.low.toFixed(4)}
- Data Source: ${marketData.isRealData ? 'LIVE Orderly Network API' : 'Cached Fallback'}

Technical Indicators (Real-time calculated):
- RSI (14): ${indicators.rsi.toFixed(2)}
- MACD: ${indicators.macd.macd.toFixed(4)} (Signal: ${indicators.macd.signal.toFixed(4)}, Histogram: ${indicators.macd.histogram.toFixed(4)})
- EMA20: $${indicators.ema20.toFixed(4)}
- EMA50: $${indicators.ema50.toFixed(4)}
- SMA20: $${indicators.sma20.toFixed(4)}
- ATR (14): ${indicators.atr.toFixed(6)}
- VWAP: $${indicators.vwap.toFixed(4)}
- Trend: ${indicators.trend}
- Orderbook Imbalance: ${orderbookImbalance.toFixed(2)} (${orderbookImbalance > 0.1 ? 'Bullish' : orderbookImbalance < -0.1 ? 'Bearish' : 'Neutral'})

Market Analysis:
${this.generateMarketAnalysis(marketData, indicators)}

User Wallet: ${wallet}
Trading Pair: ${symbol}

Guidelines:
- Be professional and data-driven using REAL market data
- Explain technical signals based on actual calculations
- Provide actionable insights with risk warnings
- Mention current trend direction and key levels
- Keep responses concise but informative
- Always reference the data source (LIVE vs Cached)
`;

            // Call OpenAI API
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini", // or "gpt-3.5-turbo" for cost savings
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: message }
                ],
                max_tokens: 500,
                temperature: 0.7,
            });

            const reply = completion.choices[0]?.message?.content || "Sorry, I couldn't generate a response. Please try again.";

            return {
                reply,
                indicators: {
                    rsi: indicators.rsi,
                    macd: indicators.macd,
                    ema20: indicators.ema20,
                    ema50: indicators.ema50,
                },
                price: marketData.price
            };

        } catch (error) {
            console.error('Chat service error:', error);

            // Fallback response if AI fails
            return {
                reply: `I apologize, but I'm having trouble accessing market data right now. Your question about ${symbol} has been noted. Please try again in a moment.`,
                indicators: {
                    rsi: 50,
                    macd: { macd: 0, signal: 0, histogram: 0 },
                    ema20: 0,
                    ema50: 0,
                },
                price: 0
            };
        }
    }

    private calculateOrderbookImbalance(orderbook: { bids: number[][], asks: number[][] }): number {
        const totalBidVolume = orderbook.bids.reduce((sum, [price, qty]) => sum + qty, 0);
        const totalAskVolume = orderbook.asks.reduce((sum, [price, qty]) => sum + qty, 0);
        const totalVolume = totalBidVolume + totalAskVolume;

        if (totalVolume === 0) return 0;

        // Return imbalance as a value between -1 and 1
        // Positive = more buying pressure, Negative = more selling pressure
        return (totalBidVolume - totalAskVolume) / totalVolume;
    }

    private generateMarketAnalysis(marketData: any, indicators: any): string {
        let analysis = '';

        // Price vs EMAs
        if (marketData.price > indicators.ema20 && indicators.ema20 > indicators.ema50) {
            analysis += '- Strong bullish trend: Price above EMA20 > EMA50\n';
        } else if (marketData.price < indicators.ema20 && indicators.ema20 < indicators.ema50) {
            analysis += '- Bearish trend developing: Price below EMA20 < EMA50\n';
        }

        // RSI analysis
        if (indicators.rsi > 70) {
            analysis += '- RSI indicates overbought conditions (>70)\n';
        } else if (indicators.rsi < 30) {
            analysis += '- RSI indicates oversold conditions (<30)\n';
        }

        // MACD analysis
        if (indicators.macd.histogram > 0 && indicators.macd.macd > indicators.macd.signal) {
            analysis += '- MACD shows bullish momentum\n';
        } else if (indicators.macd.histogram < 0 && indicators.macd.macd < indicators.macd.signal) {
            analysis += '- MACD shows bearish momentum\n';
        }

        // Volume analysis
        if (marketData.volume24h > 1000000) {
            analysis += '- High 24h volume indicates strong market interest\n';
        }

        return analysis || '- Market conditions are neutral\n';
    }

    // Generate market alerts based on technical signals
    async generateAlerts(symbol: string): Promise<string[]> {
        const alerts: string[] = [];

        try {
            const [marketData, indicators] = await Promise.all([
                orderlyMarketService.getMarketData(symbol),
                technicalAnalysisService.getAllIndicators(symbol)
            ]);

            // RSI alerts
            if (indicators.rsi > 70) {
                alerts.push(`⚠️ ${symbol}: RSI at ${indicators.rsi.toFixed(1)} - Overbought condition`);
            } else if (indicators.rsi < 30) {
                alerts.push(`🎯 ${symbol}: RSI at ${indicators.rsi.toFixed(1)} - Oversold opportunity`);
            }

            // MACD alerts
            if (indicators.macd.histogram > 0 && indicators.macd.macd > indicators.macd.signal) {
                alerts.push(`📈 ${symbol}: MACD bullish crossover detected`);
            } else if (indicators.macd.histogram < 0 && indicators.macd.macd < indicators.macd.signal) {
                alerts.push(`📉 ${symbol}: MACD bearish crossover detected`);
            }

            // Price alerts relative to EMAs
            const price = marketData.price;
            if (price > indicators.ema20 && indicators.ema20 > indicators.ema50) {
                alerts.push(`🚀 ${symbol}: Strong bullish trend - Price above EMA20 > EMA50`);
            } else if (price < indicators.ema20 && indicators.ema20 < indicators.ema50) {
                alerts.push(`⚠️ ${symbol}: Bearish trend developing - Price below EMA20 < EMA50`);
            }

            // Volume alerts
            if (marketData.change24h > 5) {
                alerts.push(`📊 ${symbol}: Strong upward momentum (+${marketData.change24h.toFixed(1)}% in 24h)`);
            } else if (marketData.change24h < -5) {
                alerts.push(`📊 ${symbol}: Significant downward pressure (${marketData.change24h.toFixed(1)}% in 24h)`);
            }

        } catch (error) {
            console.error('Alert generation error:', error);
        }

        return alerts;
    }
}

export const chatService = new ChatService();
