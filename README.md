# Spark Stock Market API

A simulated Indian stock market API server for educational purposes.

## Deployment to Render

1. Create a new **Web Service** on Render
2. Connect your GitHub repository
3. Set the following:
   - **Root Directory**: `stock-server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node

## Environment Variables

No environment variables required. The server uses `process.env.PORT` which Render provides automatically.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/stocks` | GET | All stocks |
| `/api/indices` | GET | Market indices |
| `/api/stocks/:symbol` | GET | Single stock quote |
| `/api/stocks/batch` | POST | Multiple quotes |
| `/api/stocks/:symbol/history` | GET | Historical data |
| `/api/stocks/:symbol/depth` | GET | Market depth |
| `/api/search?q=...` | GET | Search stocks |
| `/api/market/gainers` | GET | Top gainers |
| `/api/market/losers` | GET | Top losers |
| `/api/market/active` | GET | Most active |
| `/api/market/sectors` | GET | Sector performance |
| `/api/market/overview` | GET | Market summary |

## Local Development

```bash
cd stock-server
npm install
npm start
```

Server runs on `http://localhost:3002` by default.
