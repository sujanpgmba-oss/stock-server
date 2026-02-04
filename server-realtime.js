/**
 * Stock Market Backend Server - REAL DATA from Yahoo Finance
 * Provides LIVE Indian stock market data (NSE/BSE)
 * 
 * This server fetches real-time data from Yahoo Finance API
 * Use this for live market data instead of simulated prices
 */

const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3003; // Different port from simulated server

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// ============================================================================
// REAL-TIME DATA CACHE
// ============================================================================

const stockCache = new Map();
const CACHE_DURATION = 5 * 1000; // 30 seconds cache for real data
const historyCache = new Map();
const HISTORY_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for historical data

// Stock metadata (for sectors and names)
const STOCK_METADATA = {
  'RELIANCE.NS': { name: 'Reliance Industries', sector: 'Oil & Gas' },
  'TCS.NS': { name: 'Tata Consultancy Services', sector: 'IT' },
  'HDFCBANK.NS': { name: 'HDFC Bank', sector: 'Banking' },
  'INFY.NS': { name: 'Infosys', sector: 'IT' },
  'ICICIBANK.NS': { name: 'ICICI Bank', sector: 'Banking' },
  'HINDUNILVR.NS': { name: 'Hindustan Unilever', sector: 'FMCG' },
  'SBIN.NS': { name: 'State Bank of India', sector: 'Banking' },
  'BHARTIARTL.NS': { name: 'Bharti Airtel', sector: 'Telecom' },
  'KOTAKBANK.NS': { name: 'Kotak Mahindra Bank', sector: 'Banking' },
  'ITC.NS': { name: 'ITC Ltd', sector: 'FMCG' },
  'LT.NS': { name: 'Larsen & Toubro', sector: 'Construction' },
  'AXISBANK.NS': { name: 'Axis Bank', sector: 'Banking' },
  'ASIANPAINT.NS': { name: 'Asian Paints', sector: 'Paints' },
  'MARUTI.NS': { name: 'Maruti Suzuki', sector: 'Automobile' },
  'BAJFINANCE.NS': { name: 'Bajaj Finance', sector: 'Finance' },
  'TITAN.NS': { name: 'Titan Company', sector: 'Consumer Goods' },
  'SUNPHARMA.NS': { name: 'Sun Pharma', sector: 'Pharma' },
  'TATAMOTORS.NS': { name: 'Tata Motors', sector: 'Automobile' },
  'WIPRO.NS': { name: 'Wipro', sector: 'IT' },
  'HCLTECH.NS': { name: 'HCL Technologies', sector: 'IT' },
  'ULTRACEMCO.NS': { name: 'UltraTech Cement', sector: 'Cement' },
  'NESTLEIND.NS': { name: 'Nestle India', sector: 'FMCG' },
  'POWERGRID.NS': { name: 'Power Grid Corp', sector: 'Power' },
  'NTPC.NS': { name: 'NTPC Ltd', sector: 'Power' },
  'TATASTEEL.NS': { name: 'Tata Steel', sector: 'Steel' },
  'JSWSTEEL.NS': { name: 'JSW Steel', sector: 'Steel' },
  'TECHM.NS': { name: 'Tech Mahindra', sector: 'IT' },
  'ADANIENT.NS': { name: 'Adani Enterprises', sector: 'Conglomerate' },
  'ADANIPORTS.NS': { name: 'Adani Ports', sector: 'Infrastructure' },
  'ONGC.NS': { name: 'ONGC', sector: 'Oil & Gas' },
  'BAJAJ-AUTO.NS': { name: 'Bajaj Auto', sector: 'Automobile' },
  'HEROMOTOCO.NS': { name: 'Hero MotoCorp', sector: 'Automobile' },
  'EICHERMOT.NS': { name: 'Eicher Motors', sector: 'Automobile' },
  'DRREDDY.NS': { name: 'Dr. Reddys Labs', sector: 'Pharma' },
  'CIPLA.NS': { name: 'Cipla', sector: 'Pharma' },
  'DIVISLAB.NS': { name: 'Divis Labs', sector: 'Pharma' },
  'BPCL.NS': { name: 'Bharat Petroleum', sector: 'Oil & Gas' },
  'GRASIM.NS': { name: 'Grasim Industries', sector: 'Cement' },
  'BRITANNIA.NS': { name: 'Britannia Industries', sector: 'FMCG' },
  'COALINDIA.NS': { name: 'Coal India', sector: 'Mining' },
  'HINDALCO.NS': { name: 'Hindalco Industries', sector: 'Metals' },
  'APOLLOHOSP.NS': { name: 'Apollo Hospitals', sector: 'Healthcare' },
  'SBILIFE.NS': { name: 'SBI Life Insurance', sector: 'Insurance' },
  'HDFCLIFE.NS': { name: 'HDFC Life Insurance', sector: 'Insurance' },
  'BAJAJFINSV.NS': { name: 'Bajaj Finserv', sector: 'Finance' },
  'M&M.NS': { name: 'Mahindra & Mahindra', sector: 'Automobile' },
  'INDUSINDBK.NS': { name: 'IndusInd Bank', sector: 'Banking' },
  'TATACONSUM.NS': { name: 'Tata Consumer Products', sector: 'FMCG' },
  'ADANIGREEN.NS': { name: 'Adani Green Energy', sector: 'Power' },
  'SIEMENS.NS': { name: 'Siemens India', sector: 'Capital Goods' },
  'HAVELLS.NS': { name: 'Havells India', sector: 'Consumer Durables' },
  'PIDILITIND.NS': { name: 'Pidilite Industries', sector: 'Chemicals' },
  'GODREJCP.NS': { name: 'Godrej Consumer Products', sector: 'FMCG' },
  'DABUR.NS': { name: 'Dabur India', sector: 'FMCG' },
  'MARICO.NS': { name: 'Marico', sector: 'FMCG' },
  'DLF.NS': { name: 'DLF Ltd', sector: 'Real Estate' },
  'INDIGO.NS': { name: 'InterGlobe Aviation', sector: 'Aviation' },
  'SHREECEM.NS': { name: 'Shree Cement', sector: 'Cement' },
  'AMBUJACEM.NS': { name: 'Ambuja Cements', sector: 'Cement' },
  'ACC.NS': { name: 'ACC Ltd', sector: 'Cement' },
  'BANKBARODA.NS': { name: 'Bank of Baroda', sector: 'Banking' },
  'PNB.NS': { name: 'Punjab National Bank', sector: 'Banking' },
  'CANBK.NS': { name: 'Canara Bank', sector: 'Banking' },
  'ZOMATO.NS': { name: 'Zomato', sector: 'Food Tech' },
  'PAYTM.NS': { name: 'Paytm (One97)', sector: 'Fintech' },
  'NYKAA.NS': { name: 'Nykaa', sector: 'E-Commerce' },
  'DMART.NS': { name: 'Avenue Supermarts', sector: 'Retail' },
  'LTIM.NS': { name: 'LTIMindtree', sector: 'IT' },
  'MPHASIS.NS': { name: 'Mphasis', sector: 'IT' },
  'COFORGE.NS': { name: 'Coforge', sector: 'IT' },
  'PERSISTENT.NS': { name: 'Persistent Systems', sector: 'IT' },
  'TATAELXSI.NS': { name: 'Tata Elxsi', sector: 'IT' },
  'LUPIN.NS': { name: 'Lupin', sector: 'Pharma' },
  'AUROPHARMA.NS': { name: 'Aurobindo Pharma', sector: 'Pharma' },
  'BIOCON.NS': { name: 'Biocon', sector: 'Pharma' },
  'TORNTPHARM.NS': { name: 'Torrent Pharma', sector: 'Pharma' },
  'ALKEM.NS': { name: 'Alkem Labs', sector: 'Pharma' },
  'ASHOKLEY.NS': { name: 'Ashok Leyland', sector: 'Automobile' },
  'TVSMOTOR.NS': { name: 'TVS Motor', sector: 'Automobile' },
  'MOTHERSON.NS': { name: 'Motherson Sumi', sector: 'Auto Ancillary' },
  'BOSCHLTD.NS': { name: 'Bosch', sector: 'Auto Ancillary' },
  'MRF.NS': { name: 'MRF Ltd', sector: 'Tyres' },
  'APOLLOTYRE.NS': { name: 'Apollo Tyres', sector: 'Tyres' },
  'COLPAL.NS': { name: 'Colgate Palmolive', sector: 'FMCG' },
  'VBL.NS': { name: 'Varun Beverages', sector: 'FMCG' },
  'UBL.NS': { name: 'United Breweries', sector: 'FMCG' },
  'TATAPOWER.NS': { name: 'Tata Power', sector: 'Power' },
  'ADANIPOWER.NS': { name: 'Adani Power', sector: 'Power' },
  'NHPC.NS': { name: 'NHPC', sector: 'Power' },
  'JSWENERGY.NS': { name: 'JSW Energy', sector: 'Power' },
  'GAIL.NS': { name: 'GAIL India', sector: 'Oil & Gas' },
  'IOC.NS': { name: 'Indian Oil Corp', sector: 'Oil & Gas' },
  'HINDPETRO.NS': { name: 'HPCL', sector: 'Oil & Gas' },
  'PETRONET.NS': { name: 'Petronet LNG', sector: 'Oil & Gas' },
  'VEDL.NS': { name: 'Vedanta', sector: 'Metals' },
  'NMDC.NS': { name: 'NMDC', sector: 'Mining' },
  'SAIL.NS': { name: 'SAIL', sector: 'Steel' },
  'JINDALSTEL.NS': { name: 'Jindal Steel & Power', sector: 'Steel' },
  'ABB.NS': { name: 'ABB India', sector: 'Capital Goods' },
  'BHEL.NS': { name: 'BHEL', sector: 'Capital Goods' },
  'GODREJPROP.NS': { name: 'Godrej Properties', sector: 'Real Estate' },
  'OBEROIRLTY.NS': { name: 'Oberoi Realty', sector: 'Real Estate' },
  'PRESTIGE.NS': { name: 'Prestige Estates', sector: 'Real Estate' },
  'VOLTAS.NS': { name: 'Voltas', sector: 'Consumer Durables' },
  'CROMPTON.NS': { name: 'Crompton Greaves CE', sector: 'Consumer Durables' },
  'SRF.NS': { name: 'SRF Ltd', sector: 'Chemicals' },
  'ATUL.NS': { name: 'Atul Ltd', sector: 'Chemicals' },
  'DEEPAKNI.NS': { name: 'Deepak Nitrite', sector: 'Chemicals' },
  'PVRINOX.NS': { name: 'PVR INOX', sector: 'Media' },
  'ZEEL.NS': { name: 'Zee Entertainment', sector: 'Media' },
  'IDEA.NS': { name: 'Vodafone Idea', sector: 'Telecom' },
  'TATACOMM.NS': { name: 'Tata Communications', sector: 'Telecom' },
  'DELHIVERY.NS': { name: 'Delhivery', sector: 'Logistics' },
  'CONCOR.NS': { name: 'Container Corp', sector: 'Logistics' },
  'CHOLAFIN.NS': { name: 'Cholamandalam Finance', sector: 'Finance' },
  'MUTHOOTFIN.NS': { name: 'Muthoot Finance', sector: 'Finance' },
  'SBICARD.NS': { name: 'SBI Cards', sector: 'Finance' },
  'SHRIRAMFIN.NS': { name: 'Shriram Finance', sector: 'Finance' },
  'HAL.NS': { name: 'Hindustan Aeronautics', sector: 'Defence' },
  'BEL.NS': { name: 'Bharat Electronics', sector: 'Defence' },
  'IRCTC.NS': { name: 'IRCTC', sector: 'Travel' },
  'IRFC.NS': { name: 'Indian Railway Finance', sector: 'Finance' },
  'RECLTD.NS': { name: 'REC Ltd', sector: 'Finance' },
  'PFC.NS': { name: 'Power Finance Corp', sector: 'Finance' },
  'PIIND.NS': { name: 'PI Industries', sector: 'Agrochemicals' },
  'UPL.NS': { name: 'UPL Ltd', sector: 'Agrochemicals' },
  'INDHOTEL.NS': { name: 'Indian Hotels', sector: 'Hotels' },
  'TRENT.NS': { name: 'Trent Ltd', sector: 'Retail' },
  'PAGEIND.NS': { name: 'Page Industries', sector: 'Consumer Goods' },
  'BATAINDIA.NS': { name: 'Bata India', sector: 'Consumer Goods' },
};

const INDICES = {
  '^NSEI': { name: 'NIFTY 50', sector: 'Index' },
  '^BSESN': { name: 'SENSEX', sector: 'Index' },
  '^NSEBANK': { name: 'NIFTY Bank', sector: 'Index' },
  '^CNXIT': { name: 'NIFTY IT', sector: 'Index' },
};

// ============================================================================
// YAHOO FINANCE API FUNCTIONS
// ============================================================================

function fetchFromYahoo(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };
    
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function fetchRealTimeQuote(symbol) {
  // Check cache first
  const cached = stockCache.get(symbol);
  if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
    return cached.data;
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const response = await fetchFromYahoo(url);
    
    if (response.chart && response.chart.result && response.chart.result[0]) {
      const result = response.chart.result[0];
      const meta = result.meta;
      const quote = result.indicators?.quote?.[0];
      
      const currentPrice = meta.regularMarketPrice || meta.previousClose;
      const previousClose = meta.previousClose || meta.chartPreviousClose;
      const change = currentPrice - previousClose;
      const changePercent = (change / previousClose) * 100;
      
      const metadata = STOCK_METADATA[symbol] || INDICES[symbol] || { name: symbol, sector: 'Other' };
      
      const stockData = {
        symbol: symbol,
        name: metadata.name,
        sector: metadata.sector,
        price: parseFloat(currentPrice.toFixed(2)),
        previousClose: parseFloat(previousClose.toFixed(2)),
        open: meta.regularMarketOpen || previousClose,
        high: meta.regularMarketDayHigh || currentPrice,
        low: meta.regularMarketDayLow || currentPrice,
        volume: meta.regularMarketVolume || 0,
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        lastUpdated: Date.now(),
        bid: parseFloat((currentPrice * 0.9998).toFixed(2)),
        ask: parseFloat((currentPrice * 1.0002).toFixed(2)),
        bidSize: Math.floor(Math.random() * 500) + 100,
        askSize: Math.floor(Math.random() * 500) + 100,
        isRealData: true,
      };
      
      // Cache the result
      stockCache.set(symbol, { data: stockData, timestamp: Date.now() });
      
      return stockData;
    }
    throw new Error('Invalid response');
  } catch (error) {
    console.error(`Error fetching ${symbol}:`, error.message);
    // Return cached data if available (even if stale)
    if (cached) return cached.data;
    return null;
  }
}

async function fetchMultipleQuotes(symbols) {
  const results = [];
  
  // Batch requests in groups of 5 to avoid rate limiting
  const batchSize = 5;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const promises = batch.map(symbol => fetchRealTimeQuote(symbol));
    const batchResults = await Promise.all(promises);
    results.push(...batchResults.filter(Boolean));
    
    // Small delay between batches to avoid rate limiting
    if (i + batchSize < symbols.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  return results;
}

async function fetchHistoricalData(symbol, range = '1y', customInterval = null) {
  const cacheKey = `${symbol}_${range}_${customInterval || 'auto'}`;
  const cached = historyCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < HISTORY_CACHE_DURATION)) {
    return cached.data;
  }

  try {
    // Map range to Yahoo Finance parameters (default intervals)
    const rangeMap = {
      '1d': { range: '1d', interval: '5m' },
      '5d': { range: '5d', interval: '15m' },
      '1mo': { range: '1mo', interval: '1h' },
      '3mo': { range: '3mo', interval: '1d' },
      '6mo': { range: '6mo', interval: '1d' },
      '1y': { range: '1y', interval: '1d' },
      '2y': { range: '2y', interval: '1wk' },
      '5y': { range: '5y', interval: '1wk' },
      'max': { range: 'max', interval: '1mo' },
    };
    
    // Valid Yahoo Finance intervals
    const validIntervals = ['1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h', '1d', '5d', '1wk', '1mo', '3mo'];
    
    const params = rangeMap[range] || rangeMap['1y'];
    // Use custom interval if provided and valid, otherwise use default
    const interval = customInterval && validIntervals.includes(customInterval) ? customInterval : params.interval;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${params.range}&interval=${interval}`;
    
    const response = await fetchFromYahoo(url);
    
    if (response.chart && response.chart.result && response.chart.result[0]) {
      const result = response.chart.result[0];
      const timestamps = result.timestamp || [];
      const quote = result.indicators?.quote?.[0] || {};
      
      const data = timestamps.map((ts, i) => ({
        date: new Date(ts * 1000).toISOString().split('T')[0],
        timestamp: ts * 1000,
        open: quote.open?.[i] || 0,
        high: quote.high?.[i] || 0,
        low: quote.low?.[i] || 0,
        close: quote.close?.[i] || 0,
        volume: quote.volume?.[i] || 0,
      })).filter(d => d.close > 0);
      
      historyCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    }
    throw new Error('Invalid response');
  } catch (error) {
    console.error(`Error fetching history for ${symbol}:`, error.message);
    if (cached) return cached.data;
    return [];
  }
}

// Market status based on IST
function isMarketOpen() {
  const now = new Date();
  const istOffset = 5.5 * 60;
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const istMinutes = utcMinutes + istOffset;
  
  let istHour = Math.floor(istMinutes / 60) % 24;
  let istMinute = istMinutes % 60;
  let istDay = now.getUTCDay();
  if (istMinutes >= 24 * 60) istDay = (istDay + 1) % 7;
  
  if (istDay === 0 || istDay === 6) {
    return { isOpen: false, reason: 'Weekend - Market Closed', nextOpen: 'Monday 9:15 AM IST' };
  }
  
  const marketOpenMinutes = 9 * 60 + 15;
  const marketCloseMinutes = 15 * 60 + 30;
  const currentISTMinutes = istHour * 60 + istMinute;
  
  if (currentISTMinutes < 9 * 60) {
    return { isOpen: false, reason: 'Pre-Market - Opening at 9:15 AM IST', nextOpen: 'Today 9:15 AM IST' };
  }
  
  if (currentISTMinutes >= marketOpenMinutes && currentISTMinutes < marketCloseMinutes) {
    return { isOpen: true, reason: 'Market Open', session: 'Regular Trading' };
  }
  
  return { isOpen: false, reason: 'Market Closed', nextOpen: 'Tomorrow 9:15 AM IST' };
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Spark Stock Market API - LIVE DATA',
    version: '2.0.0',
    dataSource: 'Yahoo Finance (Real-Time)',
    endpoints: [
      'GET /api/health',
      'GET /api/market/status',
      'GET /api/stocks',
      'GET /api/indices',
      'GET /api/stocks/:symbol',
      'POST /api/stocks/batch',
      'GET /api/stocks/:symbol/history',
      'GET /api/search?q=...',
      'GET /api/market/overview'
    ]
  });
});

app.get('/api/health', (req, res) => {
  const marketStatus = isMarketOpen();
  res.json({ 
    status: 'ok', 
    service: 'Stock Market Server - LIVE DATA',
    dataSource: 'Yahoo Finance',
    port: PORT,
    timestamp: new Date().toISOString(),
    stocksAvailable: Object.keys(STOCK_METADATA).length,
    marketStatus: marketStatus,
    isRealData: true
  });
});

app.get('/api/market/status', (req, res) => {
  const marketStatus = isMarketOpen();
  res.json({ 
    success: true, 
    data: {
      ...marketStatus,
      timezone: 'IST (UTC+5:30)',
      exchange: 'NSE/BSE',
      tradingHours: '9:15 AM - 3:30 PM IST',
      serverTime: new Date().toISOString(),
      dataSource: 'Yahoo Finance (Real-Time)'
    }
  });
});

app.get('/api/stocks', async (req, res) => {
  try {
    const symbols = Object.keys(STOCK_METADATA);
    const stocks = await fetchMultipleQuotes(symbols);
    const marketStatus = isMarketOpen();
    
    res.json({ 
      success: true, 
      data: stocks, 
      count: stocks.length,
      marketStatus: marketStatus,
      dataSource: 'Yahoo Finance',
      isRealData: true,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/indices', async (req, res) => {
  try {
    const symbols = Object.keys(INDICES);
    const indices = await fetchMultipleQuotes(symbols);
    
    res.json({ success: true, data: indices, isRealData: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/stocks/:symbol', async (req, res) => {
  try {
    let symbol = req.params.symbol.toUpperCase();
    if (!symbol.includes('.') && !symbol.startsWith('^')) {
      symbol = `${symbol}.NS`;
    }
    
    const stockData = await fetchRealTimeQuote(symbol);
    
    if (!stockData) {
      return res.status(404).json({ success: false, error: 'Stock not found' });
    }
    
    res.json({ success: true, data: stockData, isRealData: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/stocks/batch', async (req, res) => {
  try {
    let { symbols } = req.body;
    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({ success: false, error: 'symbols array required' });
    }
    
    symbols = symbols.map(s => {
      const sym = s.toUpperCase();
      return sym.includes('.') || sym.startsWith('^') ? sym : `${sym}.NS`;
    });
    
    const results = await fetchMultipleQuotes(symbols);
    res.json({ success: true, data: results, isRealData: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/stocks/:symbol/history', async (req, res) => {
  try {
    let symbol = req.params.symbol.toUpperCase();
    if (!symbol.includes('.') && !symbol.startsWith('^')) {
      symbol = `${symbol}.NS`;
    }
    
    const { range = '1y', interval = null } = req.query;
    const data = await fetchHistoricalData(symbol, range, interval);
    
    res.json({ success: true, data, isRealData: true, range, interval: interval || 'auto' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/search', async (req, res) => {
  const query = (req.query.q || '').toUpperCase();
  
  if (!query || query.length < 2) {
    return res.json({ success: true, data: [] });
  }
  
  // Search in metadata
  const results = Object.entries(STOCK_METADATA)
    .filter(([symbol, meta]) => 
      symbol.includes(query) || 
      meta.name.toUpperCase().includes(query) ||
      meta.sector.toUpperCase().includes(query)
    )
    .slice(0, 15)
    .map(([symbol, meta]) => ({
      symbol,
      name: meta.name,
      sector: meta.sector
    }));
  
  res.json({ success: true, data: results });
});

app.get('/api/market/overview', async (req, res) => {
  try {
    const indexSymbols = Object.keys(INDICES);
    const indices = await fetchMultipleQuotes(indexSymbols);
    
    // Get top 20 stocks for market breadth
    const topStockSymbols = Object.keys(STOCK_METADATA).slice(0, 20);
    const topStocks = await fetchMultipleQuotes(topStockSymbols);
    
    const advancing = topStocks.filter(s => s.changePercent > 0).length;
    const declining = topStocks.filter(s => s.changePercent < 0).length;
    const unchanged = topStocks.filter(s => s.changePercent === 0).length;
    
    const sortedByChange = [...topStocks].sort((a, b) => b.changePercent - a.changePercent);
    
    const marketStatus = isMarketOpen();
    
    res.json({
      success: true,
      data: {
        indices,
        marketBreadth: { advancing, declining, unchanged, total: topStocks.length },
        totalVolume: topStocks.reduce((sum, s) => sum + (s.volume || 0), 0),
        topGainer: sortedByChange[0],
        topLoser: sortedByChange[sortedByChange.length - 1],
        lastUpdated: new Date().toISOString(),
        marketStatus: marketStatus,
        dataSource: 'Yahoo Finance',
        isRealData: true
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/market/gainers', async (req, res) => {
  try {
    const symbols = Object.keys(STOCK_METADATA).slice(0, 50);
    const stocks = await fetchMultipleQuotes(symbols);
    const gainers = stocks.sort((a, b) => b.changePercent - a.changePercent).slice(0, 10);
    res.json({ success: true, data: gainers, isRealData: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/market/losers', async (req, res) => {
  try {
    const symbols = Object.keys(STOCK_METADATA).slice(0, 50);
    const stocks = await fetchMultipleQuotes(symbols);
    const losers = stocks.sort((a, b) => a.changePercent - b.changePercent).slice(0, 10);
    res.json({ success: true, data: losers, isRealData: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/market/active', async (req, res) => {
  try {
    const symbols = Object.keys(STOCK_METADATA).slice(0, 50);
    const stocks = await fetchMultipleQuotes(symbols);
    const active = stocks.sort((a, b) => (b.volume || 0) - (a.volume || 0)).slice(0, 10);
    res.json({ success: true, data: active, isRealData: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/stocks/:symbol/depth', async (req, res) => {
  try {
    let symbol = req.params.symbol.toUpperCase();
    if (!symbol.includes('.') && !symbol.startsWith('^')) {
      symbol = `${symbol}.NS`;
    }
    
    const stockData = await fetchRealTimeQuote(symbol);
    if (!stockData) {
      return res.status(404).json({ success: false, error: 'Stock not found' });
    }
    
    // Generate realistic order book based on current price
    const price = stockData.price;
    const depth = {
      bids: [],
      asks: [],
    };
    
    for (let i = 0; i < 5; i++) {
      const bidPrice = price * (1 - (i + 1) * 0.001);
      const askPrice = price * (1 + (i + 1) * 0.001);
      
      depth.bids.push({
        price: parseFloat(bidPrice.toFixed(2)),
        quantity: Math.floor(Math.random() * 1000) + 100,
        orders: Math.floor(Math.random() * 20) + 1
      });
      
      depth.asks.push({
        price: parseFloat(askPrice.toFixed(2)),
        quantity: Math.floor(Math.random() * 1000) + 100,
        orders: Math.floor(Math.random() * 20) + 1
      });
    }
    
    res.json({ 
      success: true, 
      data: { symbol, ...depth },
      note: 'Order book depth is indicative'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// SERVER START
// ============================================================================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║   📈 Stock Market Server - LIVE DATA                       ║
╚════════════════════════════════════════════════════════════╝

📍 Port: ${PORT}
📊 Data Source: Yahoo Finance (Real-Time)
🔄 Cache Duration: 30 seconds
📈 Stocks Available: ${Object.keys(STOCK_METADATA).length}
📊 Indices Available: ${Object.keys(INDICES).length}
⏰ Started: ${new Date().toISOString()}

API Endpoints:
  - GET  /api/health
  - GET  /api/market/status
  - GET  /api/stocks
  - GET  /api/indices
  - GET  /api/stocks/:symbol
  - POST /api/stocks/batch
  - GET  /api/stocks/:symbol/history
  - GET  /api/search?q=...
  - GET  /api/market/overview
  - GET  /api/market/gainers
  - GET  /api/market/losers
  - GET  /api/market/active
  `);
});
