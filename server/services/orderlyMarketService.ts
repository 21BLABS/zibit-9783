// Orderly Market Service - Uses real Orderly Network APIs
// Falls back to cached/mock data if API unavailable

import { marketDataService } from './marketDataService.js';
import { technicalAnalysisService } from './technicalAnalysisService.js';

export class OrderlyMarketService {
    async getMarketData(symbol: string) {
        try {
            // Fetch real ticker data
            const ticker = await marketDataService.fetchTicker(symbol);
            const orderbook = await marketDataService.fetchOrderbook(symbol);

            return {
                symbol,
                price: ticker.price,
                volume24h: ticker.volume24h,
                change24h: ticker.priceChangePercent24h,
                high: ticker.high24h,
                low: ticker.low24h,
                orderbook: {
                    bids: orderbook.bids.slice(0, 10),
                    asks: orderbook.asks.slice(0, 10)
                },
                timestamp: Date.now(),
                isRealData: true
            };
        } catch (error) {
            console.error('Real market data fetch failed, using fallback:', error);
            // Fallback to mock data if real API fails
            return this.getMockMarketData(symbol);
        }
    }

    async getKlines(symbol: string, interval: string = '1m', limit: number = 100) {
        try {
            return await marketDataService.fetchKlines(symbol, interval, limit);
        } catch (error) {
            console.error('Real klines fetch failed, using fallback:', error);
            return this.getMockKlines(symbol, limit);
        }
    }

    // Keep existing mock fallbacks for when real API is unavailable
    private getMockMarketData(symbol: string) {
        const basePrice = this.getBasePrice(symbol);
        return {
            symbol,
            price: basePrice,
            volume24h: Math.random() * 1000000,
            change24h: (Math.random() - 0.5) * 10,
            high: basePrice * 1.02,
            low: basePrice * 0.98,
            orderbook: {
                bids: this.generateOrderbook(true),
                asks: this.generateOrderbook(false)
            },
            timestamp: Date.now(),
            isRealData: false
        };
    }

    private getMockKlines(symbol: string, limit: number) {
        const klines = [];
        let basePrice = this.getBasePrice(symbol);

        for (let i = limit; i > 0; i--) {
            const timestamp = Date.now() - (i * 60000);
            const priceChange = (Math.random() - 0.5) * 0.01;
            basePrice *= (1 + priceChange);

            klines.push({
                timestamp,
                open: basePrice,
                high: basePrice * (1 + Math.random() * 0.005),
                low: basePrice * (1 - Math.random() * 0.005),
                close: basePrice,
                volume: Math.random() * 1000
            });
        }

        return klines;
    }

    private getBasePrice(symbol: string): number {
        const prices: Record<string, number> = {
            'PERP_BTC_USDC': 65000,
            'PERP_ETH_USDC': 3200,
            'PERP_SOL_USDC': 180,
            'PERP_AVAX_USDC': 35,
            'PERP_MATIC_USDC': 0.8,
            'PERP_HYPE_USDC': 0.002
        };
        return prices[symbol] || 100;
    }

    private generateOrderbook(isBid: boolean): Array<[number, number]> {
        const orders: Array<[number, number]> = [];
        let price = 3200;

        for (let i = 0; i < 10; i++) {
            const priceChange = isBid ? -(i * 0.5) : (i * 0.5);
            price += priceChange;
            const quantity = Math.random() * 10;
            orders.push([price, quantity]);
        }

        return orders;
    }

    // Start polling for real-time updates
    startPolling(symbol: string, callback: (data: any) => void) {
        const poll = async () => {
            try {
                const data = await this.getMarketData(symbol);
                callback(data);
            } catch (error) {
                console.error('Polling error:', error);
            }
        };

        // Poll every 2 seconds as requested
        const interval = setInterval(poll, 2000);

        // Initial poll
        poll();

        return () => clearInterval(interval);
    }
}

export const orderlyMarketService = new OrderlyMarketService();
