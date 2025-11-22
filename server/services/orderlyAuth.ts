import crypto from 'crypto';

export class OrderlyAuth {
    private apiKey: string;
    private apiSecret: string;
    private accountId: string;
    private baseUrl: string;

    constructor() {
        this.apiKey = process.env.ORDERLY_KEY || '';
        this.apiSecret = process.env.ORDERLY_SECRET || '';
        this.accountId = process.env.ORDERLY_ACCOUNT_ID || '';
        this.baseUrl = process.env.ORDERLY_BASE_URL || 'https://api.orderly.org';

        console.log('🔧 Orderly Auth Config:', {
            baseUrl: this.baseUrl,
            hasApiKey: !!this.apiKey,
            hasApiSecret: !!this.apiSecret,
            hasAccountId: !!this.accountId,
            isConfigured: this.isConfigured()
        });

        if (!this.isConfigured()) {
            console.warn('⚠️ Orderly API credentials not configured. Using mock data fallback.');
        }
    }

    /**
     * Generate HMAC-SHA256 signature for Orderly API authentication
     */
    private generateSignature(timestamp: number, method: string, path: string, body?: string): string {
        const message = `${timestamp}${method.toUpperCase()}${path}${body || ''}`;
        return crypto.createHmac('sha256', this.apiSecret).update(message).digest('hex');
    }

    /**
     * Generate authenticated headers for Orderly API requests
     */
    generateAuthHeaders(method: string, path: string, body?: string): Record<string, string> {
        const timestamp = Date.now();
        const signature = this.generateSignature(timestamp, method, path, body);

        return {
            'orderly-account-id': this.accountId,
            'orderly-key': this.apiKey,
            'orderly-signature': signature,
            'orderly-timestamp': timestamp.toString(),
            'Content-Type': 'application/json',
        };
    }

    /**
     * Check if authentication is properly configured
     */
    isConfigured(): boolean {
        return !!(this.apiKey && this.apiSecret && this.accountId);
    }

    /**
     * Get base URL for API requests
     */
    getBaseUrl(): string {
        return this.baseUrl;
    }

    /**
     * Build full API URL
     */
    buildUrl(endpoint: string): string {
        return `${this.baseUrl}${endpoint}`;
    }
}

// Export function to create instance after environment loading
export function createOrderlyAuth() {
    return new OrderlyAuth();
}
