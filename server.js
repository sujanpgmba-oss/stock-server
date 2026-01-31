/**
 * Stock Market Backend Server for Render Deployment
 * Provides simulated Indian stock market data
 */

const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware - Allow all origins for CORS (adjust for production)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// ============================================================================
// STOCK DATA CACHE
// ============================================================================

const stockCache = new Map();
const CACHE_DURATION = 60 * 1000;

// Popular Indian stocks with realistic base data
const INDIAN_STOCKS = {
  'RELIANCE.NS': { name: 'Reliance Industries', sector: 'Oil & Gas', basePrice: 2450 },
  'TCS.NS': { name: 'Tata Consultancy Services', sector: 'IT', basePrice: 3850 },
  'HDFCBANK.NS': { name: 'HDFC Bank', sector: 'Banking', basePrice: 1620 },
  'INFY.NS': { name: 'Infosys', sector: 'IT', basePrice: 1480 },
  'ICICIBANK.NS': { name: 'ICICI Bank', sector: 'Banking', basePrice: 1050 },
  'HINDUNILVR.NS': { name: 'Hindustan Unilever', sector: 'FMCG', basePrice: 2380 },
  'SBIN.NS': { name: 'State Bank of India', sector: 'Banking', basePrice: 625 },
  'BHARTIARTL.NS': { name: 'Bharti Airtel', sector: 'Telecom', basePrice: 1180 },
  'KOTAKBANK.NS': { name: 'Kotak Mahindra Bank', sector: 'Banking', basePrice: 1780 },
  'ITC.NS': { name: 'ITC Ltd', sector: 'FMCG', basePrice: 435 },
  'LT.NS': { name: 'Larsen & Toubro', sector: 'Construction', basePrice: 3250 },
  'AXISBANK.NS': { name: 'Axis Bank', sector: 'Banking', basePrice: 1085 },
  'ASIANPAINT.NS': { name: 'Asian Paints', sector: 'Paints', basePrice: 2890 },
  'MARUTI.NS': { name: 'Maruti Suzuki', sector: 'Automobile', basePrice: 10850 },
  'BAJFINANCE.NS': { name: 'Bajaj Finance', sector: 'Finance', basePrice: 6750 },
  'TITAN.NS': { name: 'Titan Company', sector: 'Consumer Goods', basePrice: 3180 },
  'SUNPHARMA.NS': { name: 'Sun Pharma', sector: 'Pharma', basePrice: 1520 },
  'TATAMOTORS.NS': { name: 'Tata Motors', sector: 'Automobile', basePrice: 785 },
  'WIPRO.NS': { name: 'Wipro', sector: 'IT', basePrice: 445 },
  'HCLTECH.NS': { name: 'HCL Technologies', sector: 'IT', basePrice: 1380 },
  'ULTRACEMCO.NS': { name: 'UltraTech Cement', sector: 'Cement', basePrice: 9850 },
  'NESTLEIND.NS': { name: 'Nestle India', sector: 'FMCG', basePrice: 22500 },
  'POWERGRID.NS': { name: 'Power Grid Corp', sector: 'Power', basePrice: 285 },
  'NTPC.NS': { name: 'NTPC Ltd', sector: 'Power', basePrice: 345 },
  'TATASTEEL.NS': { name: 'Tata Steel', sector: 'Steel', basePrice: 142 },
  'JSWSTEEL.NS': { name: 'JSW Steel', sector: 'Steel', basePrice: 825 },
  'TECHM.NS': { name: 'Tech Mahindra', sector: 'IT', basePrice: 1280 },
  'ADANIENT.NS': { name: 'Adani Enterprises', sector: 'Conglomerate', basePrice: 2650 },
  'ADANIPORTS.NS': { name: 'Adani Ports', sector: 'Infrastructure', basePrice: 1180 },
  'ONGC.NS': { name: 'ONGC', sector: 'Oil & Gas', basePrice: 245 },
  'ZOMATO.NS': { name: 'Zomato', sector: 'Food Tech', basePrice: 185 },
  'PAYTM.NS': { name: 'Paytm (One97)', sector: 'Fintech', basePrice: 485 },
  'NYKAA.NS': { name: 'Nykaa (FSN E-Commerce)', sector: 'E-Commerce', basePrice: 168 },
  'DMART.NS': { name: 'Avenue Supermarts (DMart)', sector: 'Retail', basePrice: 3850 },
  'BAJAJ-AUTO.NS': { name: 'Bajaj Auto', sector: 'Automobile', basePrice: 8250 },
  'HEROMOTOCO.NS': { name: 'Hero MotoCorp', sector: 'Automobile', basePrice: 4380 },
  'EICHERMOT.NS': { name: 'Eicher Motors', sector: 'Automobile', basePrice: 4520 },
  'DRREDDY.NS': { name: 'Dr. Reddys Labs', sector: 'Pharma', basePrice: 5680 },
  'CIPLA.NS': { name: 'Cipla', sector: 'Pharma', basePrice: 1420 },
  'DIVISLAB.NS': { name: 'Divis Labs', sector: 'Pharma', basePrice: 3650 },
};

const INDICES = {
  '^NSEI': { name: 'NIFTY 50', basePrice: 22450 },
  '^BSESN': { name: 'SENSEX', basePrice: 73850 },
  '^NSEBANK': { name: 'NIFTY Bank', basePrice: 47250 },
  '^CNXIT': { name: 'NIFTY IT', basePrice: 34580 },
};

// ============================================================================
// PRICE SIMULATION ENGINE
// ============================================================================

const simulatedPrices = new Map();
const priceHistory = new Map();

function initializeSimulatedPrices() {
  const allStocks = { ...INDIAN_STOCKS, ...INDICES };
  
  Object.entries(allStocks).forEach(([symbol, data]) => {
    const volatility = getVolatility(symbol);
    const randomVariation = (Math.random() - 0.5) * 2 * volatility * data.basePrice;
    const price = data.basePrice + randomVariation;
    
    simulatedPrices.set(symbol, {
      symbol,
      name: data.name,
      sector: data.sector || 'Index',
      price: parseFloat(price.toFixed(2)),
      previousClose: data.basePrice,
      open: data.basePrice + (Math.random() - 0.5) * 0.01 * data.basePrice,
      high: price * (1 + Math.random() * 0.02),
      low: price * (1 - Math.random() * 0.02),
      volume: Math.floor(Math.random() * 10000000) + 1000000,
      change: parseFloat((price - data.basePrice).toFixed(2)),
      changePercent: parseFloat(((price - data.basePrice) / data.basePrice * 100).toFixed(2)),
      lastUpdated: Date.now(),
      bid: parseFloat((price * 0.9995).toFixed(2)),
      ask: parseFloat((price * 1.0005).toFixed(2)),
      bidSize: Math.floor(Math.random() * 1000) + 100,
      askSize: Math.floor(Math.random() * 1000) + 100,
    });
    
    priceHistory.set(symbol, generateHistoricalData(data.basePrice, symbol));
  });
}

function getVolatility(symbol) {
  const stock = INDIAN_STOCKS[symbol];
  if (!stock) return 0.02;
  
  const sectorVolatility = {
    'IT': 0.025, 'Banking': 0.02, 'Pharma': 0.022, 'Automobile': 0.023,
    'Oil & Gas': 0.025, 'FMCG': 0.015, 'Steel': 0.03, 'Finance': 0.028,
    'Telecom': 0.018, 'Power': 0.016, 'Cement': 0.02, 'Construction': 0.022,
    'Conglomerate': 0.035, 'Infrastructure': 0.025, 'Food Tech': 0.04,
    'Fintech': 0.045, 'E-Commerce': 0.04, 'Retail': 0.025,
    'Consumer Goods': 0.018, 'Paints': 0.017,
  };
  
  return sectorVolatility[stock.sector] || 0.02;
}

function generateHistoricalData(basePrice, symbol, days = 365) {
  const data = [];
  let currentPrice = basePrice * (0.7 + Math.random() * 0.4);
  const volatility = getVolatility(symbol) * 2;
  const now = new Date();
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    
    const trend = (basePrice - currentPrice) * 0.001;
    const change = (Math.random() - 0.5) * volatility * currentPrice + trend;
    
    const open = currentPrice;
    const close = Math.max(currentPrice + change, currentPrice * 0.5);
    const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5);
    const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.5);
    const volume = Math.floor(Math.random() * 10000000) + 500000;
    
    data.push({
      date: date.toISOString().split('T')[0],
      timestamp: date.getTime(),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume,
    });
    
    currentPrice = close;
  }
  
  return data;
}

function updateSimulatedPrices() {
  simulatedPrices.forEach((stockData, symbol) => {
    const volatility = getVolatility(symbol);
    const tickSize = stockData.price * volatility * 0.001;
    const change = (Math.random() - 0.5) * 2 * tickSize;
    const newPrice = Math.max(stockData.price + change, stockData.price * 0.5);
    
    const high = Math.max(stockData.high, newPrice);
    const low = Math.min(stockData.low, newPrice);
    const priceChange = newPrice - stockData.previousClose;
    const changePercent = (priceChange / stockData.previousClose) * 100;
    const volumeIncrease = Math.floor(Math.random() * 50000);
    
    simulatedPrices.set(symbol, {
      ...stockData,
      price: parseFloat(newPrice.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      change: parseFloat(priceChange.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      volume: stockData.volume + volumeIncrease,
      bid: parseFloat((newPrice * 0.9995).toFixed(2)),
      ask: parseFloat((newPrice * 1.0005).toFixed(2)),
      bidSize: Math.floor(Math.random() * 1000) + 100,
      askSize: Math.floor(Math.random() * 1000) + 100,
      lastUpdated: Date.now(),
    });
  });
}

initializeSimulatedPrices();
setInterval(updateSimulatedPrices, 2000);

// ============================================================================
// API ENDPOINTS
// ============================================================================

app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Spark Stock Market API',
    version: '1.0.0',
    endpoints: [
      'GET /api/health',
      'GET /api/stocks',
      'GET /api/indices',
      'GET /api/stocks/:symbol',
      'POST /api/stocks/batch',
      'GET /api/stocks/:symbol/history',
      'GET /api/stocks/:symbol/depth',
      'GET /api/search?q=...',
      'GET /api/market/gainers',
      'GET /api/market/losers',
      'GET /api/market/active',
      'GET /api/market/sectors',
      'GET /api/market/overview'
    ]
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Stock Market Server',
    port: PORT,
    timestamp: new Date().toISOString(),
    stocksAvailable: simulatedPrices.size 
  });
});

app.get('/api/stocks', (req, res) => {
  const stocks = Array.from(simulatedPrices.values()).filter(s => s.sector !== 'Index');
  res.json({ success: true, data: stocks, count: stocks.length });
});

app.get('/api/indices', (req, res) => {
  const indices = Array.from(simulatedPrices.values()).filter(s => s.sector === 'Index');
  res.json({ success: true, data: indices });
});

app.get('/api/stocks/:symbol', (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const searchSymbol = symbol.includes('.NS') ? symbol : `${symbol}.NS`;
  const stockData = simulatedPrices.get(searchSymbol) || simulatedPrices.get(symbol);
  
  if (!stockData) {
    return res.status(404).json({ success: false, error: 'Stock not found' });
  }
  res.json({ success: true, data: stockData });
});

app.post('/api/stocks/batch', (req, res) => {
  const { symbols } = req.body;
  if (!symbols || !Array.isArray(symbols)) {
    return res.status(400).json({ success: false, error: 'symbols array required' });
  }
  
  const results = symbols.map(symbol => {
    const searchSymbol = symbol.toUpperCase().includes('.NS') 
      ? symbol.toUpperCase() 
      : `${symbol.toUpperCase()}.NS`;
    return simulatedPrices.get(searchSymbol) || simulatedPrices.get(symbol.toUpperCase());
  }).filter(Boolean);
  
  res.json({ success: true, data: results });
});

app.get('/api/stocks/:symbol/history', (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const searchSymbol = symbol.includes('.NS') ? symbol : `${symbol}.NS`;
  const { range = '1y' } = req.query;
  
  let history = priceHistory.get(searchSymbol) || priceHistory.get(symbol);
  if (!history) {
    return res.status(404).json({ success: false, error: 'Stock history not found' });
  }
  
  const ranges = { '1d': 1, '5d': 5, '1mo': 30, '3mo': 90, '6mo': 180, '1y': 365 };
  const daysToInclude = ranges[range] || 365;
  const cutoffDate = Date.now() - daysToInclude * 24 * 60 * 60 * 1000;
  
  history = history.filter(candle => candle.timestamp >= cutoffDate);
  res.json({ success: true, data: history, symbol: searchSymbol, range });
});

app.get('/api/stocks/:symbol/depth', (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const searchSymbol = symbol.includes('.NS') ? symbol : `${symbol}.NS`;
  const stockData = simulatedPrices.get(searchSymbol) || simulatedPrices.get(symbol);
  
  if (!stockData) {
    return res.status(404).json({ success: false, error: 'Stock not found' });
  }
  
  const bids = [], asks = [];
  for (let i = 0; i < 5; i++) {
    bids.push({
      price: parseFloat((stockData.price * (1 - 0.0005 * (i + 1))).toFixed(2)),
      quantity: Math.floor(Math.random() * 5000) + 100,
      orders: Math.floor(Math.random() * 20) + 1,
    });
    asks.push({
      price: parseFloat((stockData.price * (1 + 0.0005 * (i + 1))).toFixed(2)),
      quantity: Math.floor(Math.random() * 5000) + 100,
      orders: Math.floor(Math.random() * 20) + 1,
    });
  }
  
  res.json({
    success: true,
    data: {
      symbol: searchSymbol, lastPrice: stockData.price, bids, asks,
      totalBidQty: bids.reduce((sum, b) => sum + b.quantity, 0),
      totalAskQty: asks.reduce((sum, a) => sum + a.quantity, 0),
    }
  });
});

app.get('/api/search', (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 1) return res.json({ success: true, data: [] });
  
  const query = q.toLowerCase();
  const results = Array.from(simulatedPrices.values())
    .filter(stock => 
      stock.symbol.toLowerCase().includes(query) ||
      stock.name.toLowerCase().includes(query) ||
      (stock.sector && stock.sector.toLowerCase().includes(query))
    ).slice(0, 10);
  
  res.json({ success: true, data: results });
});

app.get('/api/market/gainers', (req, res) => {
  const stocks = Array.from(simulatedPrices.values())
    .filter(s => s.sector !== 'Index')
    .sort((a, b) => b.changePercent - a.changePercent).slice(0, 10);
  res.json({ success: true, data: stocks });
});

app.get('/api/market/losers', (req, res) => {
  const stocks = Array.from(simulatedPrices.values())
    .filter(s => s.sector !== 'Index')
    .sort((a, b) => a.changePercent - b.changePercent).slice(0, 10);
  res.json({ success: true, data: stocks });
});

app.get('/api/market/active', (req, res) => {
  const stocks = Array.from(simulatedPrices.values())
    .filter(s => s.sector !== 'Index')
    .sort((a, b) => b.volume - a.volume).slice(0, 10);
  res.json({ success: true, data: stocks });
});

app.get('/api/market/sectors', (req, res) => {
  const sectorMap = new Map();
  
  Array.from(simulatedPrices.values())
    .filter(s => s.sector && s.sector !== 'Index')
    .forEach(stock => {
      if (!sectorMap.has(stock.sector)) {
        sectorMap.set(stock.sector, { stocks: [], totalChange: 0, count: 0 });
      }
      const sector = sectorMap.get(stock.sector);
      sector.stocks.push(stock);
      sector.totalChange += stock.changePercent;
      sector.count++;
    });
  
  const sectors = Array.from(sectorMap.entries()).map(([name, data]) => ({
    name,
    avgChange: parseFloat((data.totalChange / data.count).toFixed(2)),
    stockCount: data.count,
    topStock: data.stocks.sort((a, b) => b.changePercent - a.changePercent)[0]?.symbol,
  })).sort((a, b) => b.avgChange - a.avgChange);
  
  res.json({ success: true, data: sectors });
});

app.get('/api/market/overview', (req, res) => {
  const indices = Array.from(simulatedPrices.values()).filter(s => s.sector === 'Index');
  const stocks = Array.from(simulatedPrices.values()).filter(s => s.sector !== 'Index');
  
  const advancing = stocks.filter(s => s.changePercent > 0).length;
  const declining = stocks.filter(s => s.changePercent < 0).length;
  const unchanged = stocks.filter(s => s.changePercent === 0).length;
  
  res.json({
    success: true,
    data: {
      indices,
      marketBreadth: { advancing, declining, unchanged, total: stocks.length },
      totalVolume: stocks.reduce((sum, s) => sum + s.volume, 0),
      topGainer: stocks.sort((a, b) => b.changePercent - a.changePercent)[0],
      topLoser: stocks.sort((a, b) => a.changePercent - b.changePercent)[0],
      lastUpdated: new Date().toISOString(),
      marketStatus: getMarketStatus(),
    }
  });
});

function getMarketStatus() {
  const now = new Date();
  const day = now.getDay();
  const time = now.getHours() * 60 + now.getMinutes();
  
  if (day === 0 || day === 6) return { status: 'closed', reason: 'Weekend' };
  if (time >= 540 && time < 555) return { status: 'pre-market', reason: 'Pre-market session' };
  if (time >= 555 && time < 930) return { status: 'open', reason: 'Regular trading hours' };
  if (time >= 930 && time < 960) return { status: 'post-market', reason: 'Post-market session' };
  return { status: 'closed', reason: 'Outside trading hours' };
}

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`📈 Stock Market Server running on port ${PORT}`);
  console.log(`📊 Stocks available: ${simulatedPrices.size}`);
});
