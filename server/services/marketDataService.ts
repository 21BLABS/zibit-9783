import { createOrderlyAuth, OrderlyAuth } from './orderlyAuth.js';

interface TickerData {
    symbol: string;
    price: number;
    price24h: number;
    volume24h: number;
    high24h: number;
    low24h: number;
    priceChange24h: number;
    priceChangePercent24h: number;
    timestamp: number;
}

interface OrderbookData {
    symbol: string;
    bids: Array<[number, number]>; // [price, quantity]
    asks: Array<[number, number]>; // [price, quantity]
    timestamp: number;
}

interface KlineData {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

interface TradeData {
    id: string;
    symbol: string;
    price: number;
    quantity: number;
    side: 'buy' | 'sell';
    timestamp: number;
}

export class MarketDataService {
    private cache = new Map<string, any>();
    private lastFetch = new Map<string, number>();
    private readonly CACHE_DURATION = 2000; // 2 seconds
    private readonly REQUEST_TIMEOUT = 3000; // 3 seconds
    private readonly MAX_RETRIES = 3;
    private readonly RETRY_DELAY = 500; // 500ms
    private orderlyAuth: OrderlyAuth | null = null;

    private getOrderlyAuth(): OrderlyAuth {
        if (!this.orderlyAuth) {
            this.orderlyAuth = createOrderlyAuth();
        }
        return this.orderlyAuth;
    }

    /**
     * Generic retry wrapper with exponential backoff
     */
    private async withRetry<T>(
        operation: () => Promise<T>,
        operationName: string
    ): Promise<T> {
        let lastError: Error;

        for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
            try {
                return await Promise.race([
                    operation(),
                    new Promise<never>((_, reject) =>
                        setTimeout(() => reject(new Error('Request timeout')), this.REQUEST_TIMEOUT)
                    )
                ]);
            } catch (error) {
                lastError = error as Error;
                console.warn(`${operationName} attempt ${attempt} failed:`, (error as Error).message);

                if (attempt < this.MAX_RETRIES) {
                    await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * attempt));
                }
            }
        }

        throw lastError!;
    }

    /**
     * Rate limiting check
     */
    private checkRateLimit(symbol: string): boolean {
        const lastFetch = this.lastFetch.get(symbol) || 0;
        const now = Date.now();

        if (now - lastFetch < 1000) { // Max 1 request per second per symbol
            return false;
        }

        this.lastFetch.set(symbol, now);
        return true;
    }

    /**
     * Generic authenticated fetch with caching
     */
    private async authenticatedFetch(endpoint: string, method: string = 'GET', body?: string): Promise<any> {
        const url = this.getOrderlyAuth().buildUrl(endpoint);
        const headers = this.getOrderlyAuth().generateAuthHeaders(method, endpoint, body);

        const response = await fetch(url, {
            method,
            headers,
            body: body ? body : undefined,
        });

        if (!response.ok) {
            throw new Error(`Orderly API error: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Generic public fetch (no authentication required)
     */
    private async publicFetch(endpoint: string): Promise<any> {
        const url = this.getOrderlyAuth().buildUrl(endpoint);

        console.log(`Attempting public fetch: ${url}`);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            console.error(`Public API error for ${endpoint}: ${response.status} ${response.statusText}`);
            throw new Error(`Orderly API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`Public fetch successful for ${endpoint}:`, data);
        return data;
    }

    /**
     * Fetch ticker data for a symbol
     */
    async fetchTicker(symbol: string): Promise<TickerData> {
        const cacheKey = `ticker_${symbol}`;
        const cached = this.cache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
            return cached;
        }

        if (!this.checkRateLimit(symbol)) {
            return cached || this.getMockTicker(symbol);
        }

        try {
            // Try different public endpoint patterns
            let data;
            const endpointsToTry = [
                `/v1/public/market/ticker?symbol=${symbol}`,
                `/v1/public/ticker?symbol=${symbol}`,
                `/ticker?symbol=${symbol}`,
                `/v1/ticker?symbol=${symbol}`
            ];

            for (const endpoint of endpointsToTry) {
                try {
                    console.log(`Trying endpoint: ${endpoint} for ${symbol}`);
                    data = await this.withRetry(
                        () => this.publicFetch(endpoint),
                        `fetchTicker(${symbol})`
                    );
                    console.log(`✅ Found working endpoint: ${endpoint}`);
                    break;
                } catch (endpointError) {
                    console.log(`❌ Endpoint ${endpoint} failed, trying next...`);
                    continue;
                }
            }

            // If no public endpoint worked, try authenticated endpoints
            if (!data) {
                console.log(`All public endpoints failed for ${symbol}, trying authenticated...`);
                const authEndpointsToTry = [
                    `/v1/public/market/ticker?symbol=${symbol}`,
                    `/v1/public/ticker?symbol=${symbol}`
                ];

                for (const endpoint of authEndpointsToTry) {
                    try {
                        data = await this.withRetry(
                            () => this.authenticatedFetch(endpoint),
                            `fetchTicker(${symbol})`
                        );
                        console.log(`✅ Authenticated endpoint worked: ${endpoint}`);
                        break;
                    } catch (authError) {
                        console.log(`❌ Auth endpoint ${endpoint} failed, trying next...`);
                        continue;
                    }
                }
            }

            if (!data) {
                throw new Error(`All endpoints failed for symbol ${symbol}`);
            }

            const ticker: TickerData = {
                symbol,
                price: parseFloat(data.price || data.last_price || data.lastPrice || '0'),
                price24h: parseFloat(data.price24h || data.open_24h || data.open24h || '0'),
                volume24h: parseFloat(data.volume24h || data.volume_24h || data.volume24h || '0'),
                high24h: parseFloat(data.high24h || data.high_24h || data.high24h || '0'),
                low24h: parseFloat(data.low24h || data.low_24h || data.low24h || '0'),
                priceChange24h: parseFloat(data.priceChange24h || data.price_change_24h || data.change24h || '0'),
                priceChangePercent24h: parseFloat(data.priceChangePercent24h || data.price_change_percent_24h || data.changePercent24h || '0'),
                timestamp: Date.now()
            };

            // Validate that we got some real data
            if (ticker.price === 0 && ticker.volume24h === 0) {
                throw new Error(`Invalid data received for ${symbol}`);
            }

            console.log(`✅ Successfully fetched real ticker data for ${symbol}:`, ticker);
            this.cache.set(cacheKey, ticker);
            return ticker;

        } catch (error) {
            console.error(`❌ All attempts to fetch real ticker data for ${symbol} failed:`, (error as Error).message);
            console.log(`🔄 Falling back to mock data for ${symbol}`);
            return this.getMockTicker(symbol);
        }
    }

    /**
     * Fetch orderbook for a symbol
     */
    async fetchOrderbook(symbol: string): Promise<OrderbookData> {
        const cacheKey = `orderbook_${symbol}`;
        const cached = this.cache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
            return cached;
        }

        if (!this.checkRateLimit(symbol)) {
            return cached || this.getMockOrderbook(symbol);
        }

        try {
            // Try public endpoint first
            let data;
            try {
                data = await this.withRetry(
                    () => this.publicFetch(`/v1/public/orderbook?symbol=${symbol}&depth=20`),
                    `fetchOrderbook(${symbol})`
                );
            } catch (publicError) {
                // If public fails, try authenticated endpoint
                console.log(`Public orderbook fetch failed, trying authenticated for ${symbol}`);
                data = await this.withRetry(
                    () => this.authenticatedFetch(`/v1/public/orderbook?symbol=${symbol}&depth=20`),
                    `fetchOrderbook(${symbol})`
                );
            }

            const orderbook: OrderbookData = {
                symbol,
                bids: (data.bids || []).map((bid: any) => [parseFloat(bid[0]), parseFloat(bid[1])]),
                asks: (data.asks || []).map((ask: any) => [parseFloat(ask[0]), parseFloat(ask[1])]),
                timestamp: Date.now()
            };

            this.cache.set(cacheKey, orderbook);
            return orderbook;

        } catch (error) {
            console.error(`Failed to fetch orderbook for ${symbol}:`, error);
            return this.getMockOrderbook(symbol);
        }
    }

    /**
     * Fetch klines (candlestick data)
     */
    async fetchKlines(symbol: string, interval: string = '1m', limit: number = 100): Promise<KlineData[]> {
        const cacheKey = `klines_${symbol}_${interval}_${limit}`;

        if (!this.checkRateLimit(symbol)) {
            return this.cache.get(cacheKey) || this.getMockKlines(symbol, limit);
        }

        try {
            // Try public endpoint first
            let data;
            try {
                data = await this.withRetry(
                    () => this.publicFetch(`/v1/public/futures/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`),
                    `fetchKlines(${symbol}, ${interval})`
                );
            } catch (publicError) {
                // If public fails, try authenticated endpoint
                console.log(`Public klines fetch failed, trying authenticated for ${symbol}`);
                data = await this.withRetry(
                    () => this.authenticatedFetch(`/v1/public/futures/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`),
                    `fetchKlines(${symbol}, ${interval})`
                );
            }

            const klines: KlineData[] = (data || []).map((kline: any) => ({
                timestamp: parseInt(kline.timestamp || kline.t || Date.now()),
                open: parseFloat(kline.open || kline.o || '0'),
                high: parseFloat(kline.high || kline.h || '0'),
                low: parseFloat(kline.low || kline.l || '0'),
                close: parseFloat(kline.close || kline.c || '0'),
                volume: parseFloat(kline.volume || kline.v || '0')
            }));

            this.cache.set(cacheKey, klines);
            return klines;

        } catch (error) {
            console.error(`Failed to fetch klines for ${symbol}:`, error);
            return this.getMockKlines(symbol, limit);
        }
    }

    /**
     * Fetch recent trades
     */
    async fetchTrades(symbol: string, limit: number = 50): Promise<TradeData[]> {
        const cacheKey = `trades_${symbol}_${limit}`;

        if (!this.checkRateLimit(symbol)) {
            return this.cache.get(cacheKey) || this.getMockTrades(symbol, limit);
        }

        try {
            // Try public endpoint first
            let data;
            try {
                data = await this.withRetry(
                    () => this.publicFetch(`/v1/public/trades?symbol=${symbol}&limit=${limit}`),
                    `fetchTrades(${symbol})`
                );
            } catch (publicError) {
                // If public fails, try authenticated endpoint
                console.log(`Public trades fetch failed, trying authenticated for ${symbol}`);
                data = await this.withRetry(
                    () => this.authenticatedFetch(`/v1/public/trades?symbol=${symbol}&limit=${limit}`),
                    `fetchTrades(${symbol})`
                );
            }

            const trades: TradeData[] = (data || []).map((trade: any) => ({
                id: trade.id || trade.trade_id || `trade_${Date.now()}`,
                symbol: trade.symbol || symbol,
                price: parseFloat(trade.price || trade.p || '0'),
                quantity: parseFloat(trade.quantity || trade.q || '0'),
                side: trade.side || (Math.random() > 0.5 ? 'buy' : 'sell'),
                timestamp: parseInt(trade.timestamp || trade.time || Date.now())
            }));

            this.cache.set(cacheKey, trades);
            return trades;

        } catch (error) {
            console.error(`Failed to fetch trades for ${symbol}:`, error);
            return this.getMockTrades(symbol, limit);
        }
    }

    // Mock data fallbacks for when API is unavailable
    private getMockTicker(symbol: string): TickerData {
        const basePrice = this.getBasePrice(symbol);
        return {
            symbol,
            price: basePrice,
            price24h: basePrice * (1 + (Math.random() - 0.5) * 0.02),
            volume24h: Math.random() * 1000000,
            high24h: basePrice * 1.015,
            low24h: basePrice * 0.985,
            priceChange24h: (Math.random() - 0.5) * basePrice * 0.03,
            priceChangePercent24h: (Math.random() - 0.5) * 3,
            timestamp: Date.now()
        };
    }

    private getMockOrderbook(symbol: string): OrderbookData {
        const basePrice = this.getBasePrice(symbol);
        const bids: Array<[number, number]> = [];
        const asks: Array<[number, number]> = [];

        for (let i = 0; i < 10; i++) {
            bids.push([basePrice - (i * 0.5), Math.random() * 100]);
            asks.push([basePrice + (i * 0.5), Math.random() * 100]);
        }

        return { symbol, bids, asks, timestamp: Date.now() };
    }

    private getMockKlines(symbol: string, limit: number): KlineData[] {
        const basePrice = this.getBasePrice(symbol);
        const klines: KlineData[] = [];

        for (let i = limit; i > 0; i--) {
            const timestamp = Date.now() - (i * 60000);
            const open = basePrice + (Math.random() - 0.5) * 10;
            const close = open + (Math.random() - 0.5) * 2;
            const high = Math.max(open, close) + Math.random() * 1;
            const low = Math.min(open, close) - Math.random() * 1;

            klines.push({
                timestamp,
                open,
                high,
                low,
                close,
                volume: Math.random() * 1000
            });
        }

        return klines;
    }

    private getMockTrades(symbol: string, limit: number): TradeData[] {
        const trades: TradeData[] = [];
        const basePrice = this.getBasePrice(symbol);

        for (let i = 0; i < limit; i++) {
            trades.push({
                id: `trade_${i}`,
                symbol,
                price: basePrice + (Math.random() - 0.5) * 2,
                quantity: Math.random() * 10,
                side: Math.random() > 0.5 ? 'buy' : 'sell',
                timestamp: Date.now() - (i * 1000)
            });
        }

        return trades;
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

    /**
     * Clear cache (useful for testing or manual refresh)
     */
    clearCache(): void {
        this.cache.clear();
        this.lastFetch.clear();
    }

    /**
     * Get cache stats
     */
    getCacheStats(): { size: number; keys: string[] } {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

export const marketDataService = new MarketDataService();
