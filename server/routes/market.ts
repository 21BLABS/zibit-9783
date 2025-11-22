import express from 'express';
import { marketDataService } from '../services/marketDataService.js';

const router = express.Router();

router.get('/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;

        // Fetch real market data using MarketDataService
        const marketData = await marketDataService.fetchTicker(symbol);

        // Also fetch orderbook for complete market data
        const orderbook = await marketDataService.fetchOrderbook(symbol);

        // Format response to match frontend expectations
        const response = {
            symbol: marketData.symbol,
            price: marketData.price,
            volume24h: marketData.volume24h,
            change24h: marketData.priceChangePercent24h,
            high: marketData.high24h,
            low: marketData.low24h,
            orderbook: {
                bids: orderbook.bids.slice(0, 10),
                asks: orderbook.asks.slice(0, 10)
            },
            timestamp: marketData.timestamp,
            isRealData: true
        };

        res.json(response);
    } catch (error) {
        console.error('Market data fetch error:', error);

        // Fallback response with mock data if API fails
        const { symbol } = req.params;
        const basePrice = getBasePrice(symbol);

        const fallbackResponse = {
            symbol,
            price: basePrice,
            volume24h: Math.random() * 1000000,
            change24h: (Math.random() - 0.5) * 10,
            high: basePrice * 1.02,
            low: basePrice * 0.98,
            orderbook: {
                bids: generateOrderbook(true),
                asks: generateOrderbook(false)
            },
            timestamp: Date.now(),
            isRealData: false
        };

        res.status(206).json(fallbackResponse); // 206 = Partial Content (fallback data)
    }
});

// Helper functions for fallback data
function getBasePrice(symbol: string): number {
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

function generateOrderbook(isBid: boolean): Array<[number, number]> {
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

export default router;
