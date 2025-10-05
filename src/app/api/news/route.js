import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

// Cache for news data
let newsCache = new Map();
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

// In-memory fallback data in case MCP server fails
const fallbackNews = [
  {
    id: 'fallback_1',
    title: 'Base Network Hits New TVL Record',
    summary: 'Total Value Locked on Base reaches $3.5B as DeFi ecosystem continues rapid expansion.',
    content: 'Base Network has achieved a new milestone with over $3.5 billion in Total Value Locked (TVL), representing a 40% increase over the past month. The growth is driven by new DeFi protocols launching on the network and increased arbitrage activity.',
    url: '#',
    source: 'Base Analytics',
    category: 'base',
    timestamp: Date.now() - 1800000, // 30 minutes ago
    readTime: 2,
    impact: 'high',
    tip: 'Monitor new Base protocols for arbitrage opportunities with lower competition.'
  },
  {
    id: 'fallback_2',
    title: 'DEX Aggregator Volumes Surge 300% This Week',
    summary: 'Cross-DEX arbitrage activity increases as price discrepancies create profit opportunities.',
    content: 'DEX aggregator platforms report a 300% increase in trading volumes this week, primarily driven by arbitrage bots capitalizing on price differences between major decentralized exchanges. The surge coincides with increased market volatility.',
    url: '#',
    source: 'DeFi Pulse',
    category: 'arbitrage',
    timestamp: Date.now() - 3600000, // 1 hour ago
    readTime: 2,
    impact: 'high',
    tip: 'High volatility periods often create the best arbitrage opportunities.'
  },
  {
    id: 'fallback_3',
    title: 'Gas Prices Drop 60% on Layer 2 Networks',
    summary: 'Reduced transaction costs make smaller arbitrage trades profitable across L2 ecosystems.',
    content: 'Transaction costs on popular Layer 2 networks including Base, Arbitrum, and Optimism have dropped by an average of 60% this week, making micro-arbitrage strategies viable for smaller traders.',
    url: '#',
    source: 'L2 Analytics',
    category: 'trading',
    timestamp: Date.now() - 7200000, // 2 hours ago
    readTime: 2,
    impact: 'medium',
    tip: 'Lower gas costs open up more arbitrage opportunities with smaller profit margins.'
  }
];

async function callNewsServer(tool, args) {
  return new Promise((resolve, reject) => {
    const newsServerPath = path.join(process.cwd(), 'news-server.js');
    const serverProcess = spawn('node', [newsServerPath]);
    
    let responseData = '';
    let errorData = '';
    
    // Set up data handlers
    serverProcess.stdout.on('data', (data) => {
      responseData += data.toString();
    });
    
    serverProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });
    
    serverProcess.on('close', (code) => {
      if (code === 0 && responseData) {
        try {
          // Parse JSON-RPC response
          const lines = responseData.trim().split('\n');
          for (const line of lines) {
            if (line.trim()) {
              const parsed = JSON.parse(line);
              if (parsed.result && parsed.result.content) {
                const content = parsed.result.content[0].text;
                resolve(JSON.parse(content));
                return;
              }
            }
          }
          reject(new Error('No valid response found'));
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      } else {
        reject(new Error(`MCP server failed: ${errorData || 'Unknown error'}`));
      }
    });
    
    // Send JSON-RPC request
    const request = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: tool,
        arguments: args
      }
    };
    
    serverProcess.stdin.write(JSON.stringify(request) + '\n');
    serverProcess.stdin.end();
    
    // Timeout after 10 seconds
    setTimeout(() => {
      serverProcess.kill();
      reject(new Error('MCP server timeout'));
    }, 10000);
  });
}

function getCachedNews(category) {
  const cacheKey = `news_${category}`;
  const cached = newsCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
    return cached.data;
  }
  
  return null;
}

function setCachedNews(category, data) {
  const cacheKey = `news_${category}`;
  newsCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'defi';
    const limit = parseInt(searchParams.get('limit')) || 10;
    const forceRefresh = searchParams.get('refresh') === 'true';
    
    // Check cache first unless force refresh is requested
    if (!forceRefresh) {
      const cachedData = getCachedNews(category);
      if (cachedData) {
        return NextResponse.json({
          success: true,
          articles: cachedData.articles.slice(0, limit),
          total: cachedData.articles.length,
          category,
          cached: true,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    try {
      // Try to fetch from news server
      const newsResponse = await callNewsServer('fetch-crypto-news', {
        category,
        limit: limit * 2 // Fetch more to have filtering options
      });
      
      if (newsResponse.success && newsResponse.articles) {
        // Filter and sort articles
        let articles = newsResponse.articles
          .filter(article => article && article.title)
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, limit);
        
        // Cache the response
        setCachedNews(category, { articles, timestamp: newsResponse.timestamp });
        
        return NextResponse.json({
          success: true,
          articles,
          total: articles.length,
          category,
          cached: false,
          timestamp: new Date().toISOString()
        });
      } else {
        throw new Error(newsResponse.error || 'Invalid response from news server');
      }
      
    } catch (newsError) {
      console.error('News server error:', newsError.message);
      
      // Fallback to static news data
      let filteredFallback = fallbackNews;
      
      // Filter by category if specified and not 'all'
      if (category && category !== 'all') {
        filteredFallback = fallbackNews.filter(article => 
          article.category === category || 
          article.category.includes(category) ||
          category === 'defi' // Default category gets all articles
        );
      }
      
      const articles = filteredFallback
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
      
      return NextResponse.json({
        success: true,
        articles,
        total: articles.length,
        category,
        cached: false,
        fallback: true,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('News API error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      articles: [],
      total: 0,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { action, ...args } = await request.json();
    
    switch (action) {
      case 'analyze-relevance':
        const relevanceResult = await callNewsServer('analyze-news-relevance', args);
        return NextResponse.json(relevanceResult);
        
      case 'generate-tip':
        const tipResult = await callNewsServer('generate-trading-tip', args);
        return NextResponse.json(tipResult);
        
      case 'clear-cache':
        newsCache.clear();
        return NextResponse.json({ success: true, message: 'Cache cleared' });
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }
    
  } catch (error) {
    console.error('News API POST error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}