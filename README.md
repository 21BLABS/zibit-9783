# Zibit AI Trading Assistant

An AI-powered trading assistant integrated with the Zibit DEX (Orderly Network clone), providing real-time market analysis, technical indicators, and intelligent trading insights.

## 🚀 Features

### ✅ **Completed Features**

- **🤖 AI Chat Interface**: Floating, draggable chat window with professional trading analysis
- **📊 Real DEX Integration**: Connects to live Zibit DEX (`https://zibit.online`) for market data
- **📈 Technical Analysis**: RSI, MACD, EMA20/50, SMA20, ATR, VWAP indicators
- **🚨 Real-Time Alerts**: WebSocket-based notifications for trading signals
- **🔐 HMAC-SHA256 Authentication**: Secure API authentication with Orderly Network
- **⚡ Production Hardening**: Timeouts, retries, rate limiting, graceful fallbacks
- **🔄 WebSocket Real-Time Updates**: Live market data streaming (2-second polling)
- **📱 Modern UI**: Orderly Network UI integration with zero breaking changes

### 🎯 **Current Architecture**

```
Frontend (Remix + Vite): Port 5173
    ↓ API Proxy (/api/*)
Backend (Express + Socket.IO): Port 3001
    ↓ HMAC-SHA256 Auth
Zibit DEX API: https://zibit.online
```

## 🛠️ Tech Stack

### **Frontend**
- **Framework**: Remix (React-based)
- **Build Tool**: Vite
- **UI Library**: @orderly.network/react-app
- **Styling**: TailwindCSS + shadcn/ui
- **State Management**: React hooks

### **Backend**
- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **WebSocket**: Socket.IO
- **Database**: SQLite (better-sqlite3)
- **AI**: OpenAI GPT API
- **Authentication**: HMAC-SHA256

### **External APIs**
- **DEX**: Zibit (`https://zibit.online`) - Orderly Network clone
- **AI**: OpenAI API for chat analysis
- **Wallet**: Orderly Network wallet integration

## 📁 Project Structure

```
zibit-9783/
├── app/                          # Remix frontend
│   ├── components/
│   │   ├── ai/                   # AI chat components
│   │   │   ├── AIChat.tsx        # Main chat interface
│   │   │   └── useAI.ts          # AI chat hooks
│   │   └── orderlyProvider/      # Orderly SDK integration
│   ├── hooks/                    # Custom React hooks
│   ├── routes/                   # Remix routes
│   │   ├── api.ai.chat.ts        # AI chat API (REMOVED - moved to Express)
│   │   └── perp.$symbol.tsx      # Trading page
│   └── root.tsx                  # App root
├── server/                       # Express backend
│   ├── routes/
│   │   ├── ai.ts                 # AI chat API routes
│   │   ├── market.ts             # Market data routes
│   │   └── positions.ts          # Position management routes
│   ├── services/
│   │   ├── chatService.ts        # AI chat logic
│   │   ├── marketDataService.ts  # DEX market data
│   │   ├── orderlyAuth.ts        # HMAC authentication
│   │   ├── orderlyMarketService.ts # Market data orchestration
│   │   ├── technicalAnalysisService.ts # Indicators
│   │   └── websocketManager.ts   # Real-time updates
│   ├── utils/                    # Utilities
│   ├── index.ts                  # Server entry point
│   └── .env                      # Environment variables
├── package.json                  # Dependencies
├── vite.config.ts                # Vite configuration
├── tsconfig.json                 # TypeScript config
└── README.md                     # This file
```

## 🚀 Quick Start

### **Prerequisites**
- Node.js 18+
- npm or yarn
- Git

### **1. Clone & Install**

```bash
git clone <repository-url>
cd zibit-9783

# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### **2. Environment Setup**

Create `.env` file in `server/` directory:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Orderly Network / Zibit DEX Configuration
ORDERLY_BASE_URL=https://zibit.online
ORDERLY_KEY=your_orderly_api_key
ORDERLY_SECRET=your_orderly_api_secret
ORDERLY_ACCOUNT_ID=your_account_id

# Database (optional)
DATABASE_URL=./zibit.db

# CORS (optional)
FRONTEND_URL=http://localhost:5173
```

### **3. Start Development Servers**

#### **Option A: Manual Start (Recommended for Development)**

**Terminal 1: Backend Server**
```bash
cd server
npm run dev
# Server runs on http://localhost:3001
```

**Terminal 2: Frontend Server**
```bash
npm run dev
# App runs on http://localhost:5173
```

#### **Option B: Concurrent Start**
```bash
# Install concurrently for parallel execution
npm install -g concurrently

# Add to package.json scripts
"dev:full": "concurrently \"npm run dev\" \"cd server && npm run dev\""

# Then run
npm run dev:full
```

### **4. Access the Application**

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **WebSocket**: ws://localhost:3001

## 🤖 AI Chat Features

### **Available Commands**
- **"analyze"**: Get comprehensive market analysis
- **"signals"**: Show current trading signals
- **"indicators"**: Display technical indicators
- **"alerts"**: Configure price alerts
- **"portfolio"**: Analyze portfolio positions

### **Real-Time Features**
- **Live Market Data**: Pulls from Zibit DEX
- **Technical Indicators**: RSI, MACD, EMAs, VWAP
- **Orderbook Analysis**: Bid/ask imbalance detection
- **Volume Analysis**: Momentum and volume indicators
- **Price Alerts**: Customizable notification system

## 🔧 Configuration

### **Environment Variables**

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key for AI chat | Yes |
| `ORDERLY_BASE_URL` | Zibit DEX API URL | Yes |
| `ORDERLY_KEY` | Orderly API key | Yes |
| `ORDERLY_SECRET` | Orderly API secret | Yes |
| `ORDERLY_ACCOUNT_ID` | Orderly account ID | Yes |
| `DATABASE_URL` | SQLite database path | No |
| `FRONTEND_URL` | Frontend URL for CORS | No |

### **API Endpoints**

#### **AI Chat**
```
POST /api/ai/chat
Body: { message: string, wallet: string, symbol: string }
```

#### **Market Data**
```
GET /api/market/ticker/:symbol
GET /api/market/orderbook/:symbol
GET /api/market/klines/:symbol
```

#### **Positions**
```
GET /api/positions
POST /api/positions
```

## 🔒 Security Features

- **HMAC-SHA256 Authentication**: Secure API signing
- **Rate Limiting**: Prevents API abuse
- **Input Validation**: Sanitized user inputs
- **CORS Protection**: Configurable origin restrictions
- **Environment Isolation**: Sensitive data in .env files

## 📊 Monitoring & Debugging

### **Backend Logs**
The server provides detailed logging for:
- API authentication status
- Market data fetch attempts
- AI chat processing
- WebSocket connections
- Error handling and fallbacks

### **Frontend Debug Mode**
Set `NODE_ENV=development` for enhanced logging.

## 🚀 Deployment

### **Production Build**

```bash
# Build frontend
npm run build

# Build backend (if needed)
cd server
npm run build
```

### **Environment Setup**
- Set `NODE_ENV=production`
- Configure production database
- Set up SSL certificates
- Configure reverse proxy (nginx)

### **Docker Deployment**
```dockerfile
# Example Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## 🧪 Testing

### **API Testing**
```bash
# Test AI chat
curl -X POST http://localhost:3001/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"analyze market","wallet":"0x...","symbol":"PERP_HYPE_USDC"}'
```

### **WebSocket Testing**
```javascript
const socket = io('http://localhost:3001');
socket.emit('subscribe', { symbol: 'PERP_HYPE_USDC' });
```

## 🤝 Contributing

### **Development Workflow**

1. **Create Feature Branch**
```bash
git checkout -b feature/your-feature-name
```

2. **Make Changes**
- Follow existing code patterns
- Add TypeScript types
- Update tests if applicable
- Update documentation

3. **Test Locally**
- Start both servers
- Test AI chat functionality
- Verify WebSocket connections

4. **Commit & Push**
```bash
git add .
git commit -m "feat: add your feature"
git push origin feature/your-feature-name
```

### **Code Standards**
- **TypeScript**: Strict mode enabled
- **ESLint**: Configured for React/Remix
- **Prettier**: Code formatting
- **Imports**: Absolute paths with `@/` alias

## 📚 API Documentation

### **AI Chat Service**
- **File**: `server/services/chatService.ts`
- **Features**: OpenAI integration, market context, technical analysis
- **Methods**: `processMessage()`, `generateAlerts()`

### **Market Data Service**
- **File**: `server/services/marketDataService.ts`
- **Features**: DEX API integration, caching, retries
- **Methods**: `fetchTicker()`, `fetchOrderbook()`, `fetchKlines()`

### **Authentication Service**
- **File**: `server/services/orderlyAuth.ts`
- **Features**: HMAC-SHA256 signing, header generation
- **Methods**: `generateAuthHeaders()`, `buildUrl()`

## 🐛 Troubleshooting

### **Common Issues**

**"No route matches URL '/api/ai/chat'"**
- Ensure backend server is running on port 3001
- Check Vite proxy configuration in `vite.config.ts`

**"Orderly API credentials not configured"**
- Verify `.env` file exists in `server/` directory
- Check environment variable names match exactly

**"fetch failed" errors**
- Zibit DEX API may be down (expected in development)
- System automatically falls back to mock data

**WebSocket connection issues**
- Ensure backend server is running
- Check firewall settings
- Verify Socket.IO client configuration

### **Debug Mode**
Set `DEBUG=*` environment variable for verbose logging.

## 📈 Performance

### **Optimizations**
- **Request Caching**: 2-second cache for market data
- **Lazy Loading**: OrderlyAuth created on-demand
- **Connection Pooling**: SQLite connection reuse
- **Rate Limiting**: Prevents API abuse

### **Monitoring**
- WebSocket connection count
- API response times
- Error rates and fallback usage
- Memory usage tracking

## 🎯 Roadmap

### **Phase 4: Advanced Features**
- [ ] Multi-symbol analysis
- [ ] Portfolio optimization
- [ ] Risk management alerts
- [ ] Advanced charting integration
- [ ] Mobile app support

### **Phase 5: Production Scaling**
- [ ] Database optimization
- [ ] Load balancing
- [ ] Redis caching layer
- [ ] Advanced monitoring
- [ ] Auto-scaling deployment

## 📞 Support

For questions or issues:
1. Check this README
2. Review server logs
3. Test with mock data mode
4. Open GitHub issue

## 📝 License

[Your License Here]

---

**Built with ❤️ for the Zibit DEX community**

*Real market data, AI-powered insights, zero compromises.*

