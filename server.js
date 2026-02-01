/**
 * Stock Market Backend Server for Render Deployment
 * Provides simulated Indian stock market data
 * 
 * SIMULATION MODE: Works 24/7 regardless of market hours
 * This is a PRACTICE/PAPER TRADING server for educational purposes
 */

const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3002;

// ============================================================================
// SIMULATION SETTINGS (Can be controlled via API)
// ============================================================================
let simulationSettings = {
  isActive: true,              // Simulation always active (24/7)
  speed: 1,                    // 1x = normal, 2x = faster price updates, 0.5x = slower
  volatilityMultiplier: 1,     // Higher = more price movement
  updateInterval: 2000,        // Base interval in ms (2 seconds)
  alwaysOpen: true,            // Override market hours - ALWAYS OPEN for practice
  priceTickSize: 0.05,         // Minimum price change increment (0.01, 0.05, 0.10, 0.50, 1.00)
  maxTickMultiplier: 5,        // Max ticks per update (1-10). Price moves 1 to N ticks randomly for unpredictability
};

// Middleware - Allow all origins for CORS (adjust for production)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// ============================================================================
// STOCK DATA CACHE
// ============================================================================

const stockCache = new Map();
const CACHE_DURATION = 60 * 1000;

// Popular Indian stocks with realistic base data - Comprehensive NSE List
// NOTE: These are base prices for SIMULATION purposes (Paper Trading)
// Prices updated: February 2026 - Based on approximate real market values
const INDIAN_STOCKS = {
  // === NIFTY 50 STOCKS (Updated to real prices) ===
  'RELIANCE.NS': { name: 'Reliance Industries', sector: 'Oil & Gas', basePrice: 1397 },
  'TCS.NS': { name: 'Tata Consultancy Services', sector: 'IT', basePrice: 3129 },
  'HDFCBANK.NS': { name: 'HDFC Bank', sector: 'Banking', basePrice: 929 },
  'INFY.NS': { name: 'Infosys', sector: 'IT', basePrice: 1463 },
  'ICICIBANK.NS': { name: 'ICICI Bank', sector: 'Banking', basePrice: 1044 },
  'HINDUNILVR.NS': { name: 'Hindustan Unilever', sector: 'FMCG', basePrice: 2285 },
  'SBIN.NS': { name: 'State Bank of India', sector: 'Banking', basePrice: 768 },
  'BHARTIARTL.NS': { name: 'Bharti Airtel', sector: 'Telecom', basePrice: 1969 },
  'KOTAKBANK.NS': { name: 'Kotak Mahindra Bank', sector: 'Banking', basePrice: 1785 },
  'ITC.NS': { name: 'ITC Ltd', sector: 'FMCG', basePrice: 438 },
  'LT.NS': { name: 'Larsen & Toubro', sector: 'Construction', basePrice: 3580 },
  'AXISBANK.NS': { name: 'Axis Bank', sector: 'Banking', basePrice: 1028 },
  'ASIANPAINT.NS': { name: 'Asian Paints', sector: 'Paints', basePrice: 2320 },
  'MARUTI.NS': { name: 'Maruti Suzuki', sector: 'Automobile', basePrice: 12150 },
  'BAJFINANCE.NS': { name: 'Bajaj Finance', sector: 'Finance', basePrice: 931 },
  'TITAN.NS': { name: 'Titan Company', sector: 'Consumer Goods', basePrice: 3285 },
  'SUNPHARMA.NS': { name: 'Sun Pharma', sector: 'Pharma', basePrice: 1785 },
  'TATAMOTORS.NS': { name: 'Tata Motors', sector: 'Automobile', basePrice: 725 },
  'WIPRO.NS': { name: 'Wipro', sector: 'IT', basePrice: 295 },
  'HCLTECH.NS': { name: 'HCL Technologies', sector: 'IT', basePrice: 1780 },
  'ULTRACEMCO.NS': { name: 'UltraTech Cement', sector: 'Cement', basePrice: 11250 },
  'NESTLEIND.NS': { name: 'Nestle India', sector: 'FMCG', basePrice: 2185 },
  'POWERGRID.NS': { name: 'Power Grid Corp', sector: 'Power', basePrice: 295 },
  'NTPC.NS': { name: 'NTPC Ltd', sector: 'Power', basePrice: 335 },
  'TATASTEEL.NS': { name: 'Tata Steel', sector: 'Steel', basePrice: 135 },
  'JSWSTEEL.NS': { name: 'JSW Steel', sector: 'Steel', basePrice: 945 },
  'TECHM.NS': { name: 'Tech Mahindra', sector: 'IT', basePrice: 1680 },
  'ADANIENT.NS': { name: 'Adani Enterprises', sector: 'Conglomerate', basePrice: 2385 },
  'ADANIPORTS.NS': { name: 'Adani Ports', sector: 'Infrastructure', basePrice: 1185 },
  'ONGC.NS': { name: 'ONGC', sector: 'Oil & Gas', basePrice: 265 },
  'BAJAJ-AUTO.NS': { name: 'Bajaj Auto', sector: 'Automobile', basePrice: 8950 },
  'HEROMOTOCO.NS': { name: 'Hero MotoCorp', sector: 'Automobile', basePrice: 4285 },
  'EICHERMOT.NS': { name: 'Eicher Motors', sector: 'Automobile', basePrice: 5120 },
  'DRREDDY.NS': { name: 'Dr. Reddys Labs', sector: 'Pharma', basePrice: 1285 },
  'CIPLA.NS': { name: 'Cipla', sector: 'Pharma', basePrice: 1485 },
  'DIVISLAB.NS': { name: 'Divis Labs', sector: 'Pharma', basePrice: 5985 },
  'BPCL.NS': { name: 'Bharat Petroleum', sector: 'Oil & Gas', basePrice: 285 },
  'GRASIM.NS': { name: 'Grasim Industries', sector: 'Cement', basePrice: 2685 },
  'BRITANNIA.NS': { name: 'Britannia Industries', sector: 'FMCG', basePrice: 4985 },
  'COALINDIA.NS': { name: 'Coal India', sector: 'Mining', basePrice: 385 },
  'HINDALCO.NS': { name: 'Hindalco Industries', sector: 'Metals', basePrice: 595 },
  'APOLLOHOSP.NS': { name: 'Apollo Hospitals', sector: 'Healthcare', basePrice: 7185 },
  'SBILIFE.NS': { name: 'SBI Life Insurance', sector: 'Insurance', basePrice: 1485 },
  'HDFCLIFE.NS': { name: 'HDFC Life Insurance', sector: 'Insurance', basePrice: 645 },
  'BAJAJFINSV.NS': { name: 'Bajaj Finserv', sector: 'Finance', basePrice: 1785 },
  'M&M.NS': { name: 'Mahindra & Mahindra', sector: 'Automobile', basePrice: 2985 },
  'INDUSINDBK.NS': { name: 'IndusInd Bank', sector: 'Banking', basePrice: 985 },
  'TATACONSUM.NS': { name: 'Tata Consumer Products', sector: 'FMCG', basePrice: 985 },
  'ADANIGREEN.NS': { name: 'Adani Green Energy', sector: 'Power', basePrice: 1085 },
  
  // === NIFTY NEXT 50 ===
  'SIEMENS.NS': { name: 'Siemens India', sector: 'Capital Goods', basePrice: 4850 },
  'HAVELLS.NS': { name: 'Havells India', sector: 'Consumer Durables', basePrice: 1380 },
  'PIDILITIND.NS': { name: 'Pidilite Industries', sector: 'Chemicals', basePrice: 2650 },
  'GODREJCP.NS': { name: 'Godrej Consumer Products', sector: 'FMCG', basePrice: 1180 },
  'DABUR.NS': { name: 'Dabur India', sector: 'FMCG', basePrice: 545 },
  'MARICO.NS': { name: 'Marico', sector: 'FMCG', basePrice: 585 },
  'BERGEPAINT.NS': { name: 'Berger Paints', sector: 'Paints', basePrice: 545 },
  'DLF.NS': { name: 'DLF Ltd', sector: 'Real Estate', basePrice: 785 },
  'INDIGO.NS': { name: 'InterGlobe Aviation', sector: 'Aviation', basePrice: 3250 },
  'SHREECEM.NS': { name: 'Shree Cement', sector: 'Cement', basePrice: 24500 },
  'AMBUJACEM.NS': { name: 'Ambuja Cements', sector: 'Cement', basePrice: 585 },
  'ACC.NS': { name: 'ACC Ltd', sector: 'Cement', basePrice: 2180 },
  'BANKBARODA.NS': { name: 'Bank of Baroda', sector: 'Banking', basePrice: 245 },
  'PNB.NS': { name: 'Punjab National Bank', sector: 'Banking', basePrice: 95 },
  'CANBK.NS': { name: 'Canara Bank', sector: 'Banking', basePrice: 485 },
  'UNIONBANK.NS': { name: 'Union Bank of India', sector: 'Banking', basePrice: 125 },
  'IDFCFIRSTB.NS': { name: 'IDFC First Bank', sector: 'Banking', basePrice: 78 },
  'FEDERALBNK.NS': { name: 'Federal Bank', sector: 'Banking', basePrice: 148 },
  'BANDHANBNK.NS': { name: 'Bandhan Bank', sector: 'Banking', basePrice: 215 },
  'RBLBANK.NS': { name: 'RBL Bank', sector: 'Banking', basePrice: 185 },
  'YESBANK.NS': { name: 'Yes Bank', sector: 'Banking', basePrice: 22 },
  'AUBANK.NS': { name: 'AU Small Finance Bank', sector: 'Banking', basePrice: 685 },
  'ICICIPRULI.NS': { name: 'ICICI Prudential Life', sector: 'Insurance', basePrice: 545 },
  'ICICIGI.NS': { name: 'ICICI Lombard', sector: 'Insurance', basePrice: 1380 },
  'NAUKRI.NS': { name: 'Info Edge India', sector: 'Internet', basePrice: 4850 },
  'ZOMATO.NS': { name: 'Zomato', sector: 'Food Tech', basePrice: 185 },
  'PAYTM.NS': { name: 'Paytm (One97)', sector: 'Fintech', basePrice: 485 },
  'NYKAA.NS': { name: 'Nykaa (FSN E-Commerce)', sector: 'E-Commerce', basePrice: 168 },
  'DMART.NS': { name: 'Avenue Supermarts (DMart)', sector: 'Retail', basePrice: 3850 },
  'POLICYBZR.NS': { name: 'PB Fintech (Policybazaar)', sector: 'Fintech', basePrice: 485 },
  
  // === IT SECTOR ===
  'LTIM.NS': { name: 'LTIMindtree', sector: 'IT', basePrice: 5250 },
  'MPHASIS.NS': { name: 'Mphasis', sector: 'IT', basePrice: 2380 },
  'COFORGE.NS': { name: 'Coforge', sector: 'IT', basePrice: 5850 },
  'PERSISTENT.NS': { name: 'Persistent Systems', sector: 'IT', basePrice: 4250 },
  'LTTS.NS': { name: 'L&T Technology Services', sector: 'IT', basePrice: 4650 },
  'TATAELXSI.NS': { name: 'Tata Elxsi', sector: 'IT', basePrice: 6850 },
  'MINDTREE.NS': { name: 'Mindtree', sector: 'IT', basePrice: 4180 },
  'CYIENT.NS': { name: 'Cyient', sector: 'IT', basePrice: 1850 },
  'HAPPSTMNDS.NS': { name: 'Happiest Minds', sector: 'IT', basePrice: 785 },
  'SONATSOFTW.NS': { name: 'Sonata Software', sector: 'IT', basePrice: 585 },
  'ROUTE.NS': { name: 'Route Mobile', sector: 'IT', basePrice: 1650 },
  'MASTEK.NS': { name: 'Mastek', sector: 'IT', basePrice: 2450 },
  'BIRLASOFT.NS': { name: 'Birlasoft', sector: 'IT', basePrice: 585 },
  'KPITTECH.NS': { name: 'KPIT Technologies', sector: 'IT', basePrice: 1280 },
  'ZENSAR.NS': { name: 'Zensar Technologies', sector: 'IT', basePrice: 485 },
  'NIITLTD.NS': { name: 'NIIT Ltd', sector: 'IT', basePrice: 385 },
  'HEXAWARE.NS': { name: 'Hexaware Technologies', sector: 'IT', basePrice: 685 },
  
  // === PHARMA & HEALTHCARE ===
  'LUPIN.NS': { name: 'Lupin', sector: 'Pharma', basePrice: 1285 },
  'AUROPHARMA.NS': { name: 'Aurobindo Pharma', sector: 'Pharma', basePrice: 985 },
  'BIOCON.NS': { name: 'Biocon', sector: 'Pharma', basePrice: 285 },
  'TORNTPHARM.NS': { name: 'Torrent Pharma', sector: 'Pharma', basePrice: 2250 },
  'ALKEM.NS': { name: 'Alkem Labs', sector: 'Pharma', basePrice: 4850 },
  'ZYDUSLIFE.NS': { name: 'Zydus Lifesciences', sector: 'Pharma', basePrice: 685 },
  'IPCALAB.NS': { name: 'IPCA Labs', sector: 'Pharma', basePrice: 1085 },
  'LAURUSLABS.NS': { name: 'Laurus Labs', sector: 'Pharma', basePrice: 385 },
  'GLENMARK.NS': { name: 'Glenmark Pharma', sector: 'Pharma', basePrice: 985 },
  'NATCOPHARM.NS': { name: 'Natco Pharma', sector: 'Pharma', basePrice: 785 },
  'ABBOTINDIA.NS': { name: 'Abbott India', sector: 'Pharma', basePrice: 24500 },
  'GLAXO.NS': { name: 'GlaxoSmithKline Pharma', sector: 'Pharma', basePrice: 1650 },
  'PFIZER.NS': { name: 'Pfizer India', sector: 'Pharma', basePrice: 4250 },
  'SANOFI.NS': { name: 'Sanofi India', sector: 'Pharma', basePrice: 6850 },
  'MAXHEALTH.NS': { name: 'Max Healthcare', sector: 'Healthcare', basePrice: 685 },
  'FORTIS.NS': { name: 'Fortis Healthcare', sector: 'Healthcare', basePrice: 385 },
  'METROPOLIS.NS': { name: 'Metropolis Healthcare', sector: 'Healthcare', basePrice: 1650 },
  'LALPATHLAB.NS': { name: 'Dr Lal PathLabs', sector: 'Healthcare', basePrice: 2250 },
  'THYROCARE.NS': { name: 'Thyrocare Technologies', sector: 'Healthcare', basePrice: 585 },
  
  // === AUTOMOBILE & AUTO ANCILLARY ===
  'ASHOKLEY.NS': { name: 'Ashok Leyland', sector: 'Automobile', basePrice: 185 },
  'TVSMOTOR.NS': { name: 'TVS Motor', sector: 'Automobile', basePrice: 1850 },
  'ESCORTS.NS': { name: 'Escorts Kubota', sector: 'Automobile', basePrice: 2850 },
  'MOTHERSON.NS': { name: 'Motherson Sumi', sector: 'Auto Ancillary', basePrice: 125 },
  'BOSCHLTD.NS': { name: 'Bosch', sector: 'Auto Ancillary', basePrice: 18500 },
  'MRF.NS': { name: 'MRF Ltd', sector: 'Tyres', basePrice: 125000 },
  'APOLLOTYRE.NS': { name: 'Apollo Tyres', sector: 'Tyres', basePrice: 385 },
  'BALKRISIND.NS': { name: 'Balkrishna Industries', sector: 'Tyres', basePrice: 2450 },
  'CEAT.NS': { name: 'CEAT Ltd', sector: 'Tyres', basePrice: 2180 },
  'EXIDEIND.NS': { name: 'Exide Industries', sector: 'Auto Ancillary', basePrice: 285 },
  'AMARAJABAT.NS': { name: 'Amara Raja Batteries', sector: 'Auto Ancillary', basePrice: 685 },
  'BHARATFORG.NS': { name: 'Bharat Forge', sector: 'Auto Ancillary', basePrice: 1180 },
  'SUNDRMFAST.NS': { name: 'Sundram Fasteners', sector: 'Auto Ancillary', basePrice: 985 },
  'ENDURANCE.NS': { name: 'Endurance Technologies', sector: 'Auto Ancillary', basePrice: 1650 },
  'SONACOMS.NS': { name: 'Sona BLW Precision', sector: 'Auto Ancillary', basePrice: 585 },
  
  // === FMCG ===
  'COLPAL.NS': { name: 'Colgate Palmolive', sector: 'FMCG', basePrice: 2450 },
  'EMAMILTD.NS': { name: 'Emami', sector: 'FMCG', basePrice: 485 },
  'TATACONSUM.NS': { name: 'Tata Consumer', sector: 'FMCG', basePrice: 1085 },
  'VBL.NS': { name: 'Varun Beverages', sector: 'FMCG', basePrice: 1450 },
  'UBL.NS': { name: 'United Breweries', sector: 'FMCG', basePrice: 1650 },
  'MCDOWELL-N.NS': { name: 'United Spirits', sector: 'FMCG', basePrice: 1180 },
  'RADICO.NS': { name: 'Radico Khaitan', sector: 'FMCG', basePrice: 1285 },
  'JYOTHYLAB.NS': { name: 'Jyothy Labs', sector: 'FMCG', basePrice: 385 },
  'BAJAJCON.NS': { name: 'Bajaj Consumer Care', sector: 'FMCG', basePrice: 185 },
  'ZYDUSWELL.NS': { name: 'Zydus Wellness', sector: 'FMCG', basePrice: 1650 },
  
  // === POWER & ENERGY ===
  'TATAPOWER.NS': { name: 'Tata Power', sector: 'Power', basePrice: 285 },
  'ADANIPOWER.NS': { name: 'Adani Power', sector: 'Power', basePrice: 385 },
  'NHPC.NS': { name: 'NHPC', sector: 'Power', basePrice: 65 },
  'SJVN.NS': { name: 'SJVN Ltd', sector: 'Power', basePrice: 85 },
  'JSWENERGY.NS': { name: 'JSW Energy', sector: 'Power', basePrice: 485 },
  'TORNTPOWER.NS': { name: 'Torrent Power', sector: 'Power', basePrice: 585 },
  'CESC.NS': { name: 'CESC Ltd', sector: 'Power', basePrice: 115 },
  'IEX.NS': { name: 'Indian Energy Exchange', sector: 'Power', basePrice: 145 },
  'GAIL.NS': { name: 'GAIL India', sector: 'Oil & Gas', basePrice: 145 },
  'IOC.NS': { name: 'Indian Oil Corp', sector: 'Oil & Gas', basePrice: 145 },
  'HINDPETRO.NS': { name: 'HPCL', sector: 'Oil & Gas', basePrice: 385 },
  'PETRONET.NS': { name: 'Petronet LNG', sector: 'Oil & Gas', basePrice: 285 },
  'MGL.NS': { name: 'Mahanagar Gas', sector: 'Oil & Gas', basePrice: 1180 },
  'IGL.NS': { name: 'Indraprastha Gas', sector: 'Oil & Gas', basePrice: 485 },
  'GSPL.NS': { name: 'Gujarat State Petronet', sector: 'Oil & Gas', basePrice: 285 },
  'ATGL.NS': { name: 'Adani Total Gas', sector: 'Oil & Gas', basePrice: 685 },
  
  // === METALS & MINING ===
  'VEDL.NS': { name: 'Vedanta', sector: 'Metals', basePrice: 285 },
  'NMDC.NS': { name: 'NMDC', sector: 'Mining', basePrice: 185 },
  'SAIL.NS': { name: 'SAIL', sector: 'Steel', basePrice: 115 },
  'JINDALSTEL.NS': { name: 'Jindal Steel & Power', sector: 'Steel', basePrice: 685 },
  'NATIONALUM.NS': { name: 'National Aluminium', sector: 'Metals', basePrice: 115 },
  'MOIL.NS': { name: 'MOIL Ltd', sector: 'Mining', basePrice: 285 },
  'WELCORP.NS': { name: 'Welspun Corp', sector: 'Steel', basePrice: 485 },
  'RATNAMANI.NS': { name: 'Ratnamani Metals', sector: 'Steel', basePrice: 2850 },
  'APLAPOLLO.NS': { name: 'APL Apollo Tubes', sector: 'Steel', basePrice: 1450 },
  
  // === CAPITAL GOODS & INFRASTRUCTURE ===
  'ABB.NS': { name: 'ABB India', sector: 'Capital Goods', basePrice: 4850 },
  'BHEL.NS': { name: 'BHEL', sector: 'Capital Goods', basePrice: 185 },
  'CUMMINSIND.NS': { name: 'Cummins India', sector: 'Capital Goods', basePrice: 2250 },
  'THERMAX.NS': { name: 'Thermax', sector: 'Capital Goods', basePrice: 2850 },
  'GRINDWELL.NS': { name: 'Grindwell Norton', sector: 'Capital Goods', basePrice: 1850 },
  'AIAENG.NS': { name: 'AIA Engineering', sector: 'Capital Goods', basePrice: 3250 },
  'KEC.NS': { name: 'KEC International', sector: 'Infrastructure', basePrice: 685 },
  'KALPATPOWR.NS': { name: 'Kalpataru Projects', sector: 'Infrastructure', basePrice: 585 },
  'IRB.NS': { name: 'IRB Infra', sector: 'Infrastructure', basePrice: 48 },
  'PNCINFRA.NS': { name: 'PNC Infratech', sector: 'Infrastructure', basePrice: 385 },
  'NCC.NS': { name: 'NCC Ltd', sector: 'Construction', basePrice: 185 },
  'HCC.NS': { name: 'HCC', sector: 'Construction', basePrice: 28 },
  'NBCC.NS': { name: 'NBCC India', sector: 'Construction', basePrice: 85 },
  
  // === REAL ESTATE ===
  'GODREJPROP.NS': { name: 'Godrej Properties', sector: 'Real Estate', basePrice: 2250 },
  'OBEROIRLTY.NS': { name: 'Oberoi Realty', sector: 'Real Estate', basePrice: 1450 },
  'PRESTIGE.NS': { name: 'Prestige Estates', sector: 'Real Estate', basePrice: 785 },
  'BRIGADE.NS': { name: 'Brigade Enterprises', sector: 'Real Estate', basePrice: 685 },
  'SOBHA.NS': { name: 'Sobha Ltd', sector: 'Real Estate', basePrice: 785 },
  'PHOENIXLTD.NS': { name: 'Phoenix Mills', sector: 'Real Estate', basePrice: 1650 },
  'LODHA.NS': { name: 'Macrotech Developers', sector: 'Real Estate', basePrice: 1085 },
  'SUNTECK.NS': { name: 'Sunteck Realty', sector: 'Real Estate', basePrice: 485 },
  
  // === CONSUMER DURABLES ===
  'VOLTAS.NS': { name: 'Voltas', sector: 'Consumer Durables', basePrice: 1085 },
  'BLUESTARCO.NS': { name: 'Blue Star', sector: 'Consumer Durables', basePrice: 1285 },
  'WHIRLPOOL.NS': { name: 'Whirlpool India', sector: 'Consumer Durables', basePrice: 1450 },
  'CROMPTON.NS': { name: 'Crompton Greaves CE', sector: 'Consumer Durables', basePrice: 385 },
  'VGUARD.NS': { name: 'V-Guard Industries', sector: 'Consumer Durables', basePrice: 385 },
  'SYMPHONY.NS': { name: 'Symphony', sector: 'Consumer Durables', basePrice: 1085 },
  'RAJESHEXPO.NS': { name: 'Rajesh Exports', sector: 'Consumer Goods', basePrice: 485 },
  'KALYAN.NS': { name: 'Kalyan Jewellers', sector: 'Consumer Goods', basePrice: 385 },
  'BATAINDIA.NS': { name: 'Bata India', sector: 'Consumer Goods', basePrice: 1450 },
  'RELAXO.NS': { name: 'Relaxo Footwears', sector: 'Consumer Goods', basePrice: 785 },
  'PAGEIND.NS': { name: 'Page Industries', sector: 'Consumer Goods', basePrice: 38500 },
  'TRENT.NS': { name: 'Trent Ltd', sector: 'Retail', basePrice: 3850 },
  'SHOPERSTOP.NS': { name: 'Shoppers Stop', sector: 'Retail', basePrice: 785 },
  
  // === CHEMICALS ===
  'SRF.NS': { name: 'SRF Ltd', sector: 'Chemicals', basePrice: 2450 },
  'ATUL.NS': { name: 'Atul Ltd', sector: 'Chemicals', basePrice: 6850 },
  'DEEPAKNI.NS': { name: 'Deepak Nitrite', sector: 'Chemicals', basePrice: 2180 },
  'NAVINFLUOR.NS': { name: 'Navin Fluorine', sector: 'Chemicals', basePrice: 3850 },
  'CLEAN.NS': { name: 'Clean Science', sector: 'Chemicals', basePrice: 1450 },
  'FINEORG.NS': { name: 'Fine Organic', sector: 'Chemicals', basePrice: 4850 },
  'ALKYLAMINE.NS': { name: 'Alkyl Amines', sector: 'Chemicals', basePrice: 2250 },
  'AARTIIND.NS': { name: 'Aarti Industries', sector: 'Chemicals', basePrice: 585 },
  'GALAXYSURF.NS': { name: 'Galaxy Surfactants', sector: 'Chemicals', basePrice: 2850 },
  'SUDARSCHEM.NS': { name: 'Sudarshan Chemicals', sector: 'Chemicals', basePrice: 485 },
  
  // === TEXTILES ===
  'RAYMOND.NS': { name: 'Raymond', sector: 'Textiles', basePrice: 1650 },
  'ARVIND.NS': { name: 'Arvind Ltd', sector: 'Textiles', basePrice: 385 },
  'WELSPUNIND.NS': { name: 'Welspun India', sector: 'Textiles', basePrice: 145 },
  'TRIDENT.NS': { name: 'Trident Ltd', sector: 'Textiles', basePrice: 35 },
  'KPR.NS': { name: 'KPR Mill', sector: 'Textiles', basePrice: 785 },
  'GOKALDAS.NS': { name: 'Gokaldas Exports', sector: 'Textiles', basePrice: 785 },
  
  // === MEDIA & ENTERTAINMENT ===
  'PVRINOX.NS': { name: 'PVR INOX', sector: 'Media', basePrice: 1450 },
  'ZEEL.NS': { name: 'Zee Entertainment', sector: 'Media', basePrice: 185 },
  'SUNTV.NS': { name: 'Sun TV Network', sector: 'Media', basePrice: 585 },
  'NETWORK18.NS': { name: 'Network18', sector: 'Media', basePrice: 85 },
  'TV18BRDCST.NS': { name: 'TV18 Broadcast', sector: 'Media', basePrice: 45 },
  
  // === TELECOM ===
  'IDEA.NS': { name: 'Vodafone Idea', sector: 'Telecom', basePrice: 12 },
  'TATACOMM.NS': { name: 'Tata Communications', sector: 'Telecom', basePrice: 1850 },
  'INDUSTOWER.NS': { name: 'Indus Towers', sector: 'Telecom', basePrice: 285 },
  
  // === LOGISTICS & TRANSPORT ===
  'DELHIVERY.NS': { name: 'Delhivery', sector: 'Logistics', basePrice: 385 },
  'BLUEDART.NS': { name: 'Blue Dart Express', sector: 'Logistics', basePrice: 6850 },
  'CONCOR.NS': { name: 'Container Corp', sector: 'Logistics', basePrice: 685 },
  'VRL.NS': { name: 'VRL Logistics', sector: 'Logistics', basePrice: 585 },
  'MAHLOG.NS': { name: 'Mahindra Logistics', sector: 'Logistics', basePrice: 385 },
  'GATEWAY.NS': { name: 'Gateway Distriparks', sector: 'Logistics', basePrice: 85 },
  'ALLCARGO.NS': { name: 'Allcargo Logistics', sector: 'Logistics', basePrice: 385 },
  
  // === NBFC & FINANCIAL SERVICES ===
  'BAJAJHLDNG.NS': { name: 'Bajaj Holdings', sector: 'Finance', basePrice: 7850 },
  'CHOLAFIN.NS': { name: 'Cholamandalam Finance', sector: 'Finance', basePrice: 1180 },
  'MUTHOOTFIN.NS': { name: 'Muthoot Finance', sector: 'Finance', basePrice: 1450 },
  'MANAPPURAM.NS': { name: 'Manappuram Finance', sector: 'Finance', basePrice: 185 },
  'L&TFH.NS': { name: 'L&T Finance Holdings', sector: 'Finance', basePrice: 145 },
  'SBICARD.NS': { name: 'SBI Cards', sector: 'Finance', basePrice: 785 },
  'SHRIRAMFIN.NS': { name: 'Shriram Finance', sector: 'Finance', basePrice: 2250 },
  'M&MFIN.NS': { name: 'M&M Financial Services', sector: 'Finance', basePrice: 285 },
  'POONAWALLA.NS': { name: 'Poonawalla Fincorp', sector: 'Finance', basePrice: 385 },
  'CREDITACC.NS': { name: 'CreditAccess Grameen', sector: 'Finance', basePrice: 1450 },
  'IIFL.NS': { name: 'IIFL Finance', sector: 'Finance', basePrice: 485 },
  
  // === DEFENCE & AEROSPACE ===
  'HAL.NS': { name: 'Hindustan Aeronautics', sector: 'Defence', basePrice: 3850 },
  'BEL.NS': { name: 'Bharat Electronics', sector: 'Defence', basePrice: 185 },
  'BEML.NS': { name: 'BEML', sector: 'Defence', basePrice: 2850 },
  'BDL.NS': { name: 'Bharat Dynamics', sector: 'Defence', basePrice: 1085 },
  'COCHINSHIP.NS': { name: 'Cochin Shipyard', sector: 'Defence', basePrice: 785 },
  'GRSE.NS': { name: 'Garden Reach Shipbuilders', sector: 'Defence', basePrice: 785 },
  'MAZAGON.NS': { name: 'Mazagon Dock', sector: 'Defence', basePrice: 2450 },
  
  // === PSU STOCKS ===
  'IRCTC.NS': { name: 'IRCTC', sector: 'Travel', basePrice: 785 },
  'IRFC.NS': { name: 'Indian Railway Finance', sector: 'Finance', basePrice: 145 },
  'RVNL.NS': { name: 'Rail Vikas Nigam', sector: 'Infrastructure', basePrice: 185 },
  'RECLTD.NS': { name: 'REC Ltd', sector: 'Finance', basePrice: 485 },
  'PFC.NS': { name: 'Power Finance Corp', sector: 'Finance', basePrice: 385 },
  'HUDCO.NS': { name: 'HUDCO', sector: 'Finance', basePrice: 185 },
  'HFCL.NS': { name: 'HFCL Ltd', sector: 'Telecom', basePrice: 85 },
  'HINDCOPPER.NS': { name: 'Hindustan Copper', sector: 'Metals', basePrice: 185 },
  'OFSS.NS': { name: 'Oracle Financial Services', sector: 'IT', basePrice: 8850 },
  
  // === SUGAR ===
  'BALRAMCHIN.NS': { name: 'Balrampur Chini', sector: 'Sugar', basePrice: 385 },
  'RENUKA.NS': { name: 'Shree Renuka Sugars', sector: 'Sugar', basePrice: 45 },
  'DWARIKESH.NS': { name: 'Dwarikesh Sugar', sector: 'Sugar', basePrice: 85 },
  'TRIVENI.NS': { name: 'Triveni Engineering', sector: 'Sugar', basePrice: 385 },
  
  // === FERTILIZERS & AGRI ===
  'COROMANDEL.NS': { name: 'Coromandel International', sector: 'Fertilizers', basePrice: 1180 },
  'CHAMBLFERT.NS': { name: 'Chambal Fertilizers', sector: 'Fertilizers', basePrice: 385 },
  'GNFC.NS': { name: 'GNFC', sector: 'Fertilizers', basePrice: 585 },
  'GSFC.NS': { name: 'GSFC', sector: 'Fertilizers', basePrice: 185 },
  'RCF.NS': { name: 'Rashtriya Chemicals', sector: 'Fertilizers', basePrice: 145 },
  'PIIND.NS': { name: 'PI Industries', sector: 'Agrochemicals', basePrice: 3450 },
  'UPL.NS': { name: 'UPL Ltd', sector: 'Agrochemicals', basePrice: 485 },
  'BAYER.NS': { name: 'Bayer CropScience', sector: 'Agrochemicals', basePrice: 5850 },
  'RALLIS.NS': { name: 'Rallis India', sector: 'Agrochemicals', basePrice: 285 },
  
  // === PAPER & PACKAGING ===
  'JKPAPER.NS': { name: 'JK Paper', sector: 'Paper', basePrice: 385 },
  'TNPL.NS': { name: 'Tamil Nadu Newsprint', sector: 'Paper', basePrice: 285 },
  'HUHTAMAKI.NS': { name: 'Huhtamaki India', sector: 'Packaging', basePrice: 285 },
  'UFLEX.NS': { name: 'Uflex', sector: 'Packaging', basePrice: 485 },
  
  // === GEMS & JEWELLERY ===
  'TITAN.NS': { name: 'Titan', sector: 'Jewellery', basePrice: 3180 },
  'TANLA.NS': { name: 'Tanla Platforms', sector: 'IT', basePrice: 985 },
  'PCJEWELLER.NS': { name: 'PC Jeweller', sector: 'Jewellery', basePrice: 85 },
  
  // === EDUCATION ===
  'ABORETUM.NS': { name: 'Aptech', sector: 'Education', basePrice: 285 },
  
  // === HOTELS & TRAVEL ===
  'INDHOTEL.NS': { name: 'Indian Hotels', sector: 'Hotels', basePrice: 485 },
  'LEMONTRE.NS': { name: 'Lemon Tree Hotels', sector: 'Hotels', basePrice: 115 },
  'CHALET.NS': { name: 'Chalet Hotels', sector: 'Hotels', basePrice: 685 },
  'MAHINDCIE.NS': { name: 'Mahindra CIE', sector: 'Auto Ancillary', basePrice: 485 },
  'EASEMYTRIP.NS': { name: 'Easy Trip Planners', sector: 'Travel', basePrice: 35 },
  'THOMASCOOK.NS': { name: 'Thomas Cook India', sector: 'Travel', basePrice: 145 },
  'YATRA.NS': { name: 'Yatra Online', sector: 'Travel', basePrice: 115 },
};

const INDICES = {
  // Major Indices (Updated to real values Feb 2026)
  '^NSEI': { name: 'NIFTY 50', basePrice: 23250 },
  '^BSESN': { name: 'SENSEX', basePrice: 76850 },
  '^NSEBANK': { name: 'NIFTY Bank', basePrice: 49250 },
  '^CNXIT': { name: 'NIFTY IT', basePrice: 42580 },
  // Sectoral Indices
  '^CNXPHARMA': { name: 'NIFTY Pharma', basePrice: 21250 },
  '^CNXAUTO': { name: 'NIFTY Auto', basePrice: 23850 },
  '^CNXFMCG': { name: 'NIFTY FMCG', basePrice: 56450 },
  '^CNXMETAL': { name: 'NIFTY Metal', basePrice: 9150 },
  '^CNXREALTY': { name: 'NIFTY Realty', basePrice: 1085 },
  '^CNXENERGY': { name: 'NIFTY Energy', basePrice: 35450 },
  '^CNXINFRA': { name: 'NIFTY Infra', basePrice: 8250 },
  '^CNXPSUBANK': { name: 'NIFTY PSU Bank', basePrice: 7250 },
  '^CNXFIN': { name: 'NIFTY Financial Services', basePrice: 23450 },
  '^CNXMEDIA': { name: 'NIFTY Media', basePrice: 1950 },
  // Broader Indices
  '^NSMIDCP': { name: 'NIFTY Midcap 50', basePrice: 15850 },
  '^NSEMDCP100': { name: 'NIFTY Midcap 100', basePrice: 55250 },
  '^NSESMLCP': { name: 'NIFTY Smallcap 100', basePrice: 18450 },
  '^NIFTY500': { name: 'NIFTY 500', basePrice: 21850 },
};

// ============================================================================
// PRICE SIMULATION ENGINE
// ============================================================================

const simulatedPrices = new Map();
const priceHistory = new Map();

// Market status - For SIMULATED mode, always returns open when alwaysOpen is true
function isMarketOpen() {
  // SIMULATION MODE: Always open for practice/paper trading
  if (simulationSettings.alwaysOpen) {
    return { 
      isOpen: true, 
      reason: 'Simulation Mode - Always Open', 
      session: 'Practice Trading',
      isSimulated: true,
      speed: simulationSettings.speed
    };
  }
  
  // Below is real market hours logic (only used if alwaysOpen is false)
  const now = new Date();
  
  // Convert to IST (UTC + 5:30)
  const istOffset = 5.5 * 60; // 5 hours 30 minutes in minutes
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const istMinutes = utcMinutes + istOffset;
  
  // Handle day overflow
  let istHour = Math.floor(istMinutes / 60) % 24;
  let istMinute = istMinutes % 60;
  
  // Get day in IST
  let istDay = now.getUTCDay();
  if (istMinutes >= 24 * 60) {
    istDay = (istDay + 1) % 7;
  }
  
  // Weekend check (Saturday = 6, Sunday = 0)
  if (istDay === 0 || istDay === 6) {
    return { isOpen: false, reason: 'Weekend - Market Closed', nextOpen: 'Monday 9:15 AM IST' };
  }
  
  // Market hours: 9:15 AM - 3:30 PM IST
  const marketOpenMinutes = 9 * 60 + 15;  // 9:15 AM
  const marketCloseMinutes = 15 * 60 + 30; // 3:30 PM
  const currentISTMinutes = istHour * 60 + istMinute;
  
  // Pre-market: 9:00 AM - 9:15 AM
  const preMarketOpen = 9 * 60;
  
  if (currentISTMinutes < preMarketOpen) {
    return { isOpen: false, reason: 'Pre-Market - Opening at 9:15 AM IST', nextOpen: 'Today 9:15 AM IST' };
  }
  
  if (currentISTMinutes >= preMarketOpen && currentISTMinutes < marketOpenMinutes) {
    return { isOpen: false, reason: 'Pre-Market Session', nextOpen: 'Today 9:15 AM IST', preMarket: true };
  }
  
  if (currentISTMinutes >= marketOpenMinutes && currentISTMinutes < marketCloseMinutes) {
    return { isOpen: true, reason: 'Market Open', session: 'Regular Trading' };
  }
  
  // Post-market: 3:30 PM - 4:00 PM
  const postMarketClose = 16 * 60;
  if (currentISTMinutes >= marketCloseMinutes && currentISTMinutes < postMarketClose) {
    return { isOpen: false, reason: 'Post-Market Session', nextOpen: 'Tomorrow 9:15 AM IST', postMarket: true };
  }
  
  return { isOpen: false, reason: 'Market Closed', nextOpen: 'Tomorrow 9:15 AM IST' };
}

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
  const marketStatus = isMarketOpen();
  
  // SIMULATION MODE: Always update prices (24/7 practice trading)
  // In simulated mode, we ignore real market hours
  if (!marketStatus.isOpen && !simulationSettings.alwaysOpen) {
    return; // Only skip if NOT in always-open simulation mode
  }
  
  // Apply speed multiplier to volatility
  const speedMultiplier = simulationSettings.speed * simulationSettings.volatilityMultiplier;
  const tickSize = simulationSettings.priceTickSize;
  const maxTicks = simulationSettings.maxTickMultiplier;
  
  simulatedPrices.forEach((stockData, symbol) => {
    const volatility = getVolatility(symbol) * speedMultiplier;
    
    // Random number of ticks (1 to maxTicks) for unpredictable movement
    const numTicks = Math.floor(Math.random() * maxTicks) + 1;
    const tickValue = tickSize * numTicks;
    
    // Determine direction based on volatility-weighted randomness
    const directionBias = (Math.random() - 0.5) * 2; // -1 to 1
    const volatilityFactor = 1 + volatility * 10; // Amplify based on sector volatility
    
    // Sometimes no movement (more realistic)
    const movementChance = 0.7 + (volatility * 5); // Higher volatility = more likely to move
    if (Math.random() > movementChance) {
      return; // No price change this tick
    }
    
    // Calculate change with random tick count
    const change = directionBias > 0 ? tickValue : -tickValue;
    
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

// Dynamic update interval based on simulation speed
let updateIntervalId = null;
function startPriceUpdates() {
  if (updateIntervalId) clearInterval(updateIntervalId);
  const interval = Math.max(500, simulationSettings.updateInterval / simulationSettings.speed);
  updateIntervalId = setInterval(updateSimulatedPrices, interval);
  console.log(`Price updates running every ${interval}ms (speed: ${simulationSettings.speed}x)`);
}
startPriceUpdates();

// ============================================================================
// API ENDPOINTS
// ============================================================================

app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Spark Stock Market API - SIMULATION MODE',
    version: '2.0.0',
    mode: 'Paper Trading (24/7)',
    simulationSettings: simulationSettings,
    endpoints: [
      'GET /api/health',
      'GET /api/simulation/settings',
      'PUT /api/simulation/settings',
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

// ============================================================================
// SIMULATION CONTROL ENDPOINTS
// ============================================================================

// Get simulation settings
app.get('/api/simulation/settings', (req, res) => {
  res.json({ 
    success: true, 
    data: simulationSettings,
    description: {
      isActive: 'Whether simulation is running',
      speed: 'Price update speed multiplier (0.5x, 1x, 2x, 5x)',
      volatilityMultiplier: 'Price volatility multiplier (higher = more movement)',
      updateInterval: 'Base update interval in milliseconds',
      alwaysOpen: 'If true, market is always open for practice trading'
    }
  });
});

// Update simulation settings
app.put('/api/simulation/settings', (req, res) => {
  const { speed, volatilityMultiplier, alwaysOpen, updateInterval, priceTickSize, maxTickMultiplier } = req.body;
  
  if (speed !== undefined && speed > 0 && speed <= 10) {
    simulationSettings.speed = speed;
  }
  if (volatilityMultiplier !== undefined && volatilityMultiplier > 0 && volatilityMultiplier <= 5) {
    simulationSettings.volatilityMultiplier = volatilityMultiplier;
  }
  if (alwaysOpen !== undefined) {
    simulationSettings.alwaysOpen = alwaysOpen;
  }
  if (updateInterval !== undefined && updateInterval >= 500 && updateInterval <= 10000) {
    simulationSettings.updateInterval = updateInterval;
  }
  // Valid tick sizes: 0.01, 0.05, 0.10, 0.25, 0.50, 1.00
  const validTickSizes = [0.01, 0.05, 0.10, 0.25, 0.50, 1.00];
  if (priceTickSize !== undefined && validTickSizes.includes(priceTickSize)) {
    simulationSettings.priceTickSize = priceTickSize;
  }
  // Max tick multiplier: 1-10 (how many ticks max per update)
  if (maxTickMultiplier !== undefined && maxTickMultiplier >= 1 && maxTickMultiplier <= 10) {
    simulationSettings.maxTickMultiplier = Math.floor(maxTickMultiplier);
  }
  
  // Restart price updates with new settings
  startPriceUpdates();
  
  res.json({ 
    success: true, 
    message: 'Simulation settings updated',
    data: simulationSettings 
  });
});

// Reset simulation (reset all prices to base)
app.post('/api/simulation/reset', (req, res) => {
  initializeSimulatedPrices();
  res.json({ 
    success: true, 
    message: 'Simulation reset - all prices restored to base values'
  });
});

app.get('/api/health', (req, res) => {
  const marketStatus = isMarketOpen();
  res.json({ 
    status: 'ok', 
    service: 'Stock Market Server - SIMULATION',
    mode: 'Paper Trading (24/7)',
    port: PORT,
    timestamp: new Date().toISOString(),
    stocksAvailable: simulatedPrices.size,
    marketStatus: marketStatus,
    simulationSettings: simulationSettings
  });
});

// Market Status Endpoint
app.get('/api/market/status', (req, res) => {
  const marketStatus = isMarketOpen();
  res.json({ 
    success: true, 
    data: {
      ...marketStatus,
      timezone: 'IST (UTC+5:30)',
      exchange: 'NSE/BSE (Simulated)',
      tradingHours: simulationSettings.alwaysOpen ? '24/7 Practice Mode' : '9:15 AM - 3:30 PM IST',
      serverTime: new Date().toISOString(),
      simulationMode: true,
      simulationSettings: simulationSettings
    }
  });
});

app.get('/api/stocks', (req, res) => {
  const stocks = Array.from(simulatedPrices.values()).filter(s => s.sector !== 'Index');
  const marketStatus = isMarketOpen();
  res.json({ 
    success: true, 
    data: stocks, 
    count: stocks.length, 
    marketStatus: marketStatus,
    disclaimer: 'SIMULATED DATA - For Paper Trading & Learning Only. Not Real Market Prices.',
    isSimulated: true
  });
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
  
  // Add or update the current price as the latest candle for real-time chart updates
  const currentStock = simulatedPrices.get(searchSymbol) || simulatedPrices.get(symbol);
  if (currentStock && history.length > 0) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const lastCandle = history[history.length - 1];
    
    // If the last candle is from today, update it with current price
    if (lastCandle.date === today) {
      history[history.length - 1] = {
        ...lastCandle,
        close: currentStock.price,
        high: Math.max(lastCandle.high, currentStock.price),
        low: Math.min(lastCandle.low, currentStock.price),
        volume: currentStock.volume || lastCandle.volume,
      };
    } else {
      // Add a new candle for today with current price
      history.push({
        date: today,
        timestamp: now.getTime(),
        open: currentStock.previousClose || currentStock.price,
        high: currentStock.high || currentStock.price,
        low: currentStock.low || currentStock.price,
        close: currentStock.price,
        volume: currentStock.volume || 0,
      });
    }
  }
  
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
  const marketStatus = isMarketOpen();
  
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
      marketStatus: marketStatus,
    }
  });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`📈 Stock Market Server running on port ${PORT}`);
  console.log(`📊 Stocks available: ${simulatedPrices.size}`);
});
