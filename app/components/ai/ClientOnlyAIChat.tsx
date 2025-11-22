import { Suspense, lazy } from 'react';

// Lazy load the AIChat component to make it client-only
const AIChat = lazy(() => import('./AIChat').then(module => ({ default: module.AIChat })));

interface ClientOnlyAIChatProps {
    symbol?: string;
}

export function ClientOnlyAIChat({ symbol }: ClientOnlyAIChatProps) {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-full text-neutral-400">Loading AI...</div>}>
            <AIChat symbol={symbol} />
        </Suspense>
    );
}
