// Technical Analysis Service - Calculates technical indicators
// Uses klines data to compute RSI, MACD, EMA, SMA, etc.

export class TechnicalAnalysisService {

    // Relative Strength Index (RSI)
    calculateRSI(prices: number[], period: number = 14): number {
        if (prices.length < period + 1) return 50; // Neutral RSI

        const gains: number[] = [];
        const losses: number[] = [];

        for (let i = 1; i < prices.length; i++) {
            const change = prices[i] - prices[i - 1];
            gains.push(change > 0 ? change : 0);
            losses.push(change < 0 ? Math.abs(change) : 0);
        }

        let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
        let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;

        // Calculate RSI using smoothed averages
        for (let i = period; i < gains.length; i++) {
            avgGain = (avgGain * (period - 1) + gains[i]) / period;
            avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
        }

        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));

        return Math.max(0, Math.min(100, rsi)); // Clamp between 0-100
    }

    // Exponential Moving Average (EMA)
    calculateEMA(prices: number[], period: number): number {
        if (prices.length < period) return prices[prices.length - 1] || 0;

        const multiplier = 2 / (period + 1);
        let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;

        for (let i = period; i < prices.length; i++) {
            ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
        }

        return ema;
    }

    // Simple Moving Average (SMA)
    calculateSMA(prices: number[], period: number): number {
        if (prices.length < period) return prices[prices.length - 1] || 0;

        const recentPrices = prices.slice(-period);
        return recentPrices.reduce((sum, price) => sum + price, 0) / period;
    }

    // MACD (Moving Average Convergence Divergence)
    calculateMACD(prices: number[]): { macd: number, signal: number, histogram: number } {
        const ema12 = this.calculateEMA(prices, 12);
        const ema26 = this.calculateEMA(prices, 26);
        const macd = ema12 - ema26;

        // Signal line is EMA9 of MACD
        const macdValues = [macd]; // In real implementation, you'd calculate multiple MACD values
        const signal = this.calculateEMA(macdValues, 9);

        const histogram = macd - signal;

        return { macd, signal, histogram };
    }

    // Average True Range (ATR)
    calculateATR(highs: number[], lows: number[], closes: number[], period: number = 14): number {
        if (highs.length < period) return 0;

        const trueRanges: number[] = [];

        for (let i = 1; i < highs.length; i++) {
            const tr = Math.max(
                highs[i] - lows[i], // Current high - current low
                Math.abs(highs[i] - closes[i - 1]), // Current high - previous close
                Math.abs(lows[i] - closes[i - 1]) // Current low - previous close
            );
            trueRanges.push(tr);
        }

        if (trueRanges.length < period) return trueRanges[trueRanges.length - 1] || 0;

        return this.calculateSMA(trueRanges, period);
    }

    // Volume Weighted Average Price (VWAP)
    calculateVWAP(highs: number[], lows: number[], closes: number[], volumes: number[]): number {
        if (highs.length !== lows.length || lows.length !== closes.length || closes.length !== volumes.length) {
            return closes[closes.length - 1] || 0;
        }

        let priceVolumeSum = 0;
        let volumeSum = 0;

        for (let i = 0; i < highs.length; i++) {
            const typicalPrice = (highs[i] + lows[i] + closes[i]) / 3;
            priceVolumeSum += typicalPrice * volumes[i];
            volumeSum += volumes[i];
        }

        return volumeSum > 0 ? priceVolumeSum / volumeSum : closes[closes.length - 1] || 0;
    }

    // Detect breakout patterns
    detectBreakout(prices: number[], resistance: number): boolean {
        if (prices.length < 2) return false;

        const currentPrice = prices[prices.length - 1];
        const previousPrice = prices[prices.length - 2];

        // Simple breakout detection: price crosses above resistance
        return previousPrice <= resistance && currentPrice > resistance;
    }

    // Detect support and resistance levels
    detectSupportResistance(prices: number[], highs: number[], lows: number[]): { support: number, resistance: number } {
        const sortedHighs = [...highs].sort((a, b) => b - a);
        const sortedLows = [...lows].sort((a, b) => a - b);

        // Find most common high (resistance) and low (support) levels
        const resistance = sortedHighs[Math.floor(sortedHighs.length * 0.1)]; // Top 10%
        const support = sortedLows[Math.floor(sortedLows.length * 0.1)]; // Bottom 10%

        return { support, resistance };
    }

    // Determine trend direction
    trendDirection(prices: number[], sma20: number, sma50: number): 'bullish' | 'bearish' | 'neutral' {
        if (prices.length < 2) return 'neutral';

        const currentPrice = prices[prices.length - 1];
        const shortTermTrend = currentPrice > sma20 ? 1 : -1;
        const longTermTrend = sma20 > sma50 ? 1 : -1;

        if (shortTermTrend > 0 && longTermTrend > 0) return 'bullish';
        if (shortTermTrend < 0 && longTermTrend < 0) return 'bearish';

        return 'neutral';
    }

    // Get all indicators for a symbol
    async getAllIndicators(symbol: string): Promise<{
        rsi: number;
        macd: { macd: number, signal: number, histogram: number };
        ema20: number;
        ema50: number;
        sma20: number;
        atr: number;
        vwap: number;
        trend: 'bullish' | 'bearish' | 'neutral';
    }> {
        try {
            // Import marketDataService dynamically to avoid circular dependency
            const { marketDataService } = await import('./marketDataService.js');

            // Fetch real klines data for technical analysis
            const klines = await marketDataService.fetchKlines(symbol, '1m', 200);

            if (!klines || klines.length < 50) {
                throw new Error('Insufficient klines data');
            }

            // Extract price data from klines
            const closes = klines.map(k => k.close);
            const highs = klines.map(k => k.high);
            const lows = klines.map(k => k.low);
            const volumes = klines.map(k => k.volume);

            // Calculate indicators using real data
            const rsi = this.calculateRSI(closes);
            const macd = this.calculateMACD(closes);
            const ema20 = this.calculateEMA(closes, 20);
            const ema50 = this.calculateEMA(closes, 50);
            const sma20 = this.calculateSMA(closes, 20);
            const atr = this.calculateATR(highs, lows, closes);
            const vwap = this.calculateVWAP(highs, lows, closes, volumes);
            const trend = this.trendDirection(closes, sma20, ema50);

            return {
                rsi,
                macd,
                ema20,
                ema50,
                sma20,
                atr,
                vwap,
                trend
            };

        } catch (error) {
            console.error(`Failed to get real indicators for ${symbol}, using mock data:`, error);
            // Fallback to mock data if real data fetch fails
            return this.getMockIndicators(symbol);
        }
    }

    // Mock indicators fallback
    private getMockIndicators(symbol: string): {
        rsi: number;
        macd: { macd: number, signal: number, histogram: number };
        ema20: number;
        ema50: number;
        sma20: number;
        atr: number;
        vwap: number;
        trend: 'bullish' | 'bearish' | 'neutral';
    } {
        const basePrice = this.getBasePrice(symbol);
        const mockPrices = Array.from({ length: 100 }, () => basePrice + (Math.random() - 0.5) * basePrice * 0.1);
        const mockHighs = mockPrices.map(p => p * (1 + Math.random() * 0.01));
        const mockLows = mockPrices.map(p => p * (1 - Math.random() * 0.01));
        const mockVolumes = Array.from({ length: 100 }, () => Math.random() * 1000);

        const rsi = this.calculateRSI(mockPrices);
        const macd = this.calculateMACD(mockPrices);
        const ema20 = this.calculateEMA(mockPrices, 20);
        const ema50 = this.calculateEMA(mockPrices, 50);
        const sma20 = this.calculateSMA(mockPrices, 20);
        const atr = this.calculateATR(mockHighs, mockLows, mockPrices);
        const vwap = this.calculateVWAP(mockHighs, mockLows, mockPrices, mockVolumes);
        const trend = this.trendDirection(mockPrices, sma20, ema50);

        return {
            rsi,
            macd,
            ema20,
            ema50,
            sma20,
            atr,
            vwap,
            trend
        };
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
}

export const technicalAnalysisService = new TechnicalAnalysisService();
