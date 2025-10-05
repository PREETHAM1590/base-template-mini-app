import { NextRequest, NextResponse } from 'next/server';

// Mock news data generator
// In production, integrate with news APIs like CoinGecko, CryptoPanic, etc.
async function fetchCryptoNews(category?: string, limit: number = 10) {
  // Simulated news articles
  const mockNews = [
    {
      title: 'Base Network TVL Surges Past $2 Billion Milestone',
      description: 'The Base Layer 2 network has seen explosive growth, with total value locked doubling in the past month as more DeFi protocols deploy.',
      category: 'DeFi',
      sentiment: 'positive',
      source: { name: 'DeFi Pulse' },
      publishedAt: new Date(Date.now() - 3600000).toISOString(),
      url: 'https://defipulse.com/base-tvl-milestone',
      tags: ['Base', 'TVL', 'DeFi'],
      impact: 'high'
    },
    {
      title: 'Uniswap V4 Hooks Enable Advanced Arbitrage Strategies',
      description: 'The introduction of custom hooks in Uniswap V4 allows traders to implement sophisticated arbitrage logic directly in the protocol.',
      category: 'Protocol',
      sentiment: 'positive',
      source: { name: 'Uniswap Labs' },
      publishedAt: new Date(Date.now() - 7200000).toISOString(),
      url: 'https://blog.uniswap.org/v4-hooks',
      tags: ['Uniswap', 'Arbitrage', 'DeFi'],
      impact: 'high'
    },
    {
      title: 'Gas Optimization on Base Reduces Trading Costs by 90%',
      description: 'Recent network upgrades have dramatically reduced transaction costs on Base, making small arbitrage trades profitable.',
      category: 'Network',
      sentiment: 'positive',
      source: { name: 'Base Analytics' },
      publishedAt: new Date(Date.now() - 10800000).toISOString(),
      url: 'https://base.org/gas-optimization',
      tags: ['Base', 'Gas', 'Optimization'],
      impact: 'medium'
    },
    {
      title: 'Aerodrome Finance Becomes Leading DEX on Base',
      description: 'Aerodrome has captured over 40% of Base DEX volume, offering deep liquidity and competitive fees for traders.',
      category: 'DEX',
      sentiment: 'neutral',
      source: { name: 'DefiLlama' },
      publishedAt: new Date(Date.now() - 14400000).toISOString(),
      url: 'https://defillama.com/protocol/aerodrome',
      tags: ['Aerodrome', 'Base', 'DEX'],
      impact: 'medium'
    },
    {
      title: 'Flash Loan Attacks Prompt Security Updates Across DeFi',
      description: 'Recent exploits have led to enhanced security measures, with major protocols implementing additional safeguards.',
      category: 'Security',
      sentiment: 'negative',
      source: { name: 'Rekt News' },
      publishedAt: new Date(Date.now() - 18000000).toISOString(),
      url: 'https://rekt.news/flash-loan-updates',
      tags: ['Security', 'Flash Loans', 'DeFi'],
      impact: 'high'
    },
    {
      title: 'cbETH-ETH Spreads Narrow as Liquid Staking Matures',
      description: 'The price differential between cbETH and ETH has tightened, reducing arbitrage opportunities but indicating market maturity.',
      category: 'Market',
      sentiment: 'neutral',
      source: { name: 'Coinbase Research' },
      publishedAt: new Date(Date.now() - 21600000).toISOString(),
      url: 'https://coinbase.com/research/cbeth-spreads',
      tags: ['cbETH', 'Staking', 'Arbitrage'],
      impact: 'low'
    },
    {
      title: 'AI-Powered Trading Bots See 300% Growth in Usage',
      description: 'Automated trading solutions using AI are gaining popularity, with users reporting improved profitability and reduced manual effort.',
      category: 'AI',
      sentiment: 'positive',
      source: { name: 'CryptoAI Weekly' },
      publishedAt: new Date(Date.now() - 25200000).toISOString(),
      url: 'https://cryptoai.news/ai-trading-growth',
      tags: ['AI', 'Trading', 'Automation'],
      impact: 'high'
    },
    {
      title: 'Balancer Introduces Dynamic Fee Model for Better Pricing',
      description: 'New dynamic fee structure on Balancer pools adjusts based on volatility, improving price discovery and reducing impermanent loss.',
      category: 'Protocol',
      sentiment: 'positive',
      source: { name: 'Balancer Labs' },
      publishedAt: new Date(Date.now() - 28800000).toISOString(),
      url: 'https://balancer.fi/dynamic-fees',
      tags: ['Balancer', 'Fees', 'DeFi'],
      impact: 'medium'
    },
    {
      title: 'Regulatory Clarity Boosts Institutional DeFi Participation',
      description: 'Recent regulatory frameworks have encouraged traditional finance institutions to explore DeFi opportunities.',
      category: 'Regulation',
      sentiment: 'positive',
      source: { name: 'CoinDesk' },
      publishedAt: new Date(Date.now() - 32400000).toISOString(),
      url: 'https://coindesk.com/defi-regulation-clarity',
      tags: ['Regulation', 'Institutional', 'DeFi'],
      impact: 'high'
    },
    {
      title: 'Cross-Chain Bridges Enable New Arbitrage Routes',
      description: 'Improved bridge technology allows traders to exploit price differences across multiple blockchains efficiently.',
      category: 'Infrastructure',
      sentiment: 'positive',
      source: { name: 'Bridge Protocol News' },
      publishedAt: new Date(Date.now() - 36000000).toISOString(),
      url: 'https://bridge.news/cross-chain-arbitrage',
      tags: ['Bridges', 'Cross-chain', 'Arbitrage'],
      impact: 'medium'
    }
  ];

  // Filter by category if specified
  let articles = category 
    ? mockNews.filter(article => 
        article.category.toLowerCase() === category.toLowerCase() ||
        article.tags.some(tag => tag.toLowerCase().includes(category.toLowerCase()))
      )
    : mockNews;

  // Limit results
  articles = articles.slice(0, limit);

  return articles;
}

// Fetch real news from external API (example implementation)
async function fetchRealNews(category?: string, limit: number = 10) {
  try {
    // Example: Using a crypto news API (you'll need to add your own API key)
    // const API_KEY = process.env.CRYPTO_NEWS_API_KEY;
    // const response = await fetch(`https://api.example.com/news?category=${category}&limit=${limit}`, {
    //   headers: { 'X-API-Key': API_KEY }
    // });
    // return await response.json();

    // For now, return mock data
    return await fetchCryptoNews(category, limit);
  } catch (error) {
    console.error('Failed to fetch real news:', error);
    // Fallback to mock data
    return await fetchCryptoNews(category, limit);
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') || undefined;
    const limit = parseInt(searchParams.get('limit') || '10');
    const source = searchParams.get('source'); // Optional: filter by source
    const sentiment = searchParams.get('sentiment'); // Optional: filter by sentiment

    // Fetch news articles
    let articles = await fetchRealNews(category, limit * 2); // Fetch extra for filtering

    // Apply additional filters
    if (source) {
      articles = articles.filter((article: any) => 
        article.source?.name?.toLowerCase().includes(source.toLowerCase())
      );
    }

    if (sentiment) {
      articles = articles.filter((article: any) => 
        article.sentiment === sentiment
      );
    }

    // Limit final results
    articles = articles.slice(0, limit);

    // Add metadata
    const response = {
      success: true,
      articles,
      meta: {
        count: articles.length,
        category,
        timestamp: Date.now(),
        nextUpdate: Date.now() + 300000 // Update every 5 minutes
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('News API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch news',
        articles: []
      },
      { status: 500 }
    );
  }
}