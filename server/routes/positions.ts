import express from 'express';

const router = express.Router();

// Mock positions data - in a real implementation, this would fetch from Orderly API
const mockPositions = [
    {
        symbol: 'PERP_ETH_USDC',
        size: 0.5,
        entryPrice: 3200,
        markPrice: 3250,
        pnl: 125,
        pnlPercent: 7.81
    },
    {
        symbol: 'PERP_BTC_USDC',
        size: 0.02,
        entryPrice: 65000,
        markPrice: 65500,
        pnl: 20,
        pnlPercent: 0.31
    }
];

router.get('/:wallet', async (req, res) => {
    try {
        const { wallet } = req.params;

        // For now, return mock positions
        // In production, this would query Orderly API for user's actual positions
        const userPositions = mockPositions.filter(pos => pos.symbol.includes('PERP'));

        res.json({
            wallet,
            positions: userPositions,
            totalPnl: userPositions.reduce((sum, pos) => sum + pos.pnl, 0),
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('Positions fetch error:', error);
        res.status(500).json({
            error: 'Failed to fetch positions'
        });
    }
});

export default router;
