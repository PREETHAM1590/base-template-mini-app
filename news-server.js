#!/usr/bin/env node

// Simplified news server for ArbiTips
const https = require('https');
const fs = require('fs');

class ArbiTipsNewsServer {
  constructor() {
    this.setupProcessHandlers();
  }

  setupProcessHandlers() {
    // Handle stdin for JSON-RPC like communication
    process.stdin.on('data', async (data) => {
      try {
        const input = data.toString().trim();
        if (input) {
          const request = JSON.parse(input);
          const response = await this.handleRequest(request);
          console.log(JSON.stringify(response));
        }
      } catch (error) {
        console.log(JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -1, message: error.message },
          id: null
        }));
      }
    });

    process.stdin.on('end', () => {
      process.exit(0);
    });
  }

  async handleRequest(request) {
    const { method, params, id } = request;

    try {
      let result;
      
      if (method === 'tools/call') {
        const { name, arguments: args } = params;
        
        switch (name) {
          case 'fetch-crypto-news':
            result = await this.fetchCryptoNews(args);
            break;
          case 'analyze-news-relevance':
            result = await this.analyzeNewsRelevance(args);
            break;
          case 'generate-trading-tip':
            result = await this.generateTradingTip(args);
            break;
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } else {
        throw new Error(`Unknown method: ${method}`);
      }

      return {
        jsonrpc: '2.0',
        result,
        id
      };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        error: { code: -1, message: error.message },
        id
      };
    }
  }

  async fetchCryptoNews(args) {
    const { category, limit = 10 } = args;
    
    try {
      // Use multiple sources for comprehensive news coverage
      const newsData = await this.fetchFromMultipleSources(category, limit);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            articles: newsData,
            total: newsData.length,
            category,
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error.message,
            category,
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };
    }
  }

  async fetchFromMultipleSources(category, limit) {
    const articles = [];
    
    try {
      // Try to fetch from CoinGecko (free API)
      const coingeckoNews = await this.fetchCoinGeckoNews(category, Math.ceil(limit / 2));
      articles.push(...coingeckoNews);
    } catch (error) {
      console.error('CoinGecko API error:', error.message);
    }

    // Always add some curated articles
    const curatedNews = this.getCuratedNews(category, limit - articles.length);
    articles.push(...curatedNews);

    return articles.slice(0, limit);
  }

  async fetchCoinGeckoNews(category, limit) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.coingecko.com',
        path: '/api/v3/news',
        method: 'GET',
        headers: {
          'User-Agent': 'ArbiTips/1.0'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            if (res.statusCode !== 200) {
              throw new Error(`HTTP ${res.statusCode}`);
            }
            
            const parsed = JSON.parse(data);
            
            if (parsed.data && Array.isArray(parsed.data)) {
              const articles = parsed.data.slice(0, limit).map(article => ({
                id: article.id || `cg_${Date.now()}_${Math.random()}`,
                title: article.title,
                summary: article.description || article.title,
                content: article.description || `${article.title}. Read more for detailed information.`,
                url: article.url,
                source: 'CoinGecko',
                category: this.categorizeArticle(article.title + ' ' + (article.description || '')),
                timestamp: new Date(article.updated_at || Date.now()).getTime(),
                readTime: Math.ceil((article.description || article.title).split(' ').length / 200),
                impact: this.assessImpact(article.title + ' ' + (article.description || '')),
                tip: this.generateQuickTip(article.title, category)
              }));
              
              resolve(articles);
            } else {
              resolve([]);
            }
          } catch (parseError) {
            reject(new Error(`Parse error: ${parseError.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  getCuratedNews(category, limit) {
    const allNews = [
      {
        title: "Base Network Surpasses $3B TVL Milestone",
        content: "Base blockchain reaches new all-time high in Total Value Locked, driven by increased DeFi activity and new protocol launches.",
        source: "Base Blog",
        impact: "high",
        url: "https://base.org/blog"
      },
      {
        title: "Uniswap V4 Hooks Create New Arbitrage Opportunities",  
        content: "The introduction of custom hooks in Uniswap V4 is creating novel arbitrage strategies and MEV opportunities for sophisticated traders.",
        source: "Uniswap Labs",
        impact: "high",
        url: "https://blog.uniswap.org/uniswap-v4"
      },
      {
        title: "Layer 2 Gas Costs Hit New Lows Across Networks",
        content: "Transaction costs on Optimism, Arbitrum, and Base continue to decrease, making micro-arbitrage strategies increasingly profitable.",
        source: "L2Beat",
        impact: "medium",
        url: "https://l2beat.com/scaling/summary"
      },
      {
        title: "DeFi Market Volatility Creates Arbitrage Windows",
        content: "Recent market movements in ETH and major tokens are creating short-term price discrepancies across DEXs, presenting opportunities for quick arbitrage profits.",
        source: "Market Analysis",
        impact: "high",
        url: "https://defipulse.com/blog"
      },
      {
        title: "Base DEX Ecosystem Expands with New Protocols",
        content: "Several new decentralized exchanges are launching on Base, potentially creating new arbitrage routes and trading opportunities for alert traders.",
        source: "Base Ecosystem",
        impact: "medium",
        url: "https://base.org/ecosystem"
      },
      {
        title: "Gas Price Optimization Strategies for Arbitrage",
        content: "New techniques for optimizing gas costs in arbitrage transactions are helping traders maintain profitability even during network congestion periods.",
        source: "DeFi Research",
        impact: "medium",
        url: "https://ethereum.org/en/developers/docs/gas/"
      },
      {
        title: "MEV Protection Tools Gain Adoption Among Traders",
        content: "Private mempools and MEV protection services are becoming essential tools for arbitrage traders looking to prevent front-running attacks.",
        source: "MEV Watch",
        impact: "high",
        url: "https://flashbots.net/"
      },
      {
        title: "Cross-Chain Bridge Volumes Hit Record Highs",
        content: "Increased bridge activity between Ethereum and Layer 2s is creating new cross-chain arbitrage opportunities for sophisticated traders.",
        source: "Bridge Analytics",
        impact: "medium",
        url: "https://dune.com/queries/1745/bridges"
      }
    ];

    return allNews.slice(0, limit).map((article, index) => ({
      id: `curated_${Date.now()}_${index}`,
      title: article.title,
      summary: article.content,
      content: article.content,
      url: article.url,
      source: article.source,
      category: this.categorizeArticle(article.title + ' ' + article.content),
      timestamp: Date.now() - (index * 1800000), // 30 minutes apart
      readTime: Math.ceil(article.content.split(' ').length / 200),
      impact: article.impact,
      tip: this.generateQuickTip(article.title, category)
    }));
  }

  categorizeArticle(text) {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('base') || lowerText.includes('layer 2')) return 'base';
    if (lowerText.includes('defi') || lowerText.includes('dex') || lowerText.includes('uniswap')) return 'defi';
    if (lowerText.includes('arbitrage') || lowerText.includes('mev')) return 'arbitrage';
    if (lowerText.includes('trading') || lowerText.includes('price')) return 'trading';
    return 'blockchain';
  }

  assessImpact(text) {
    const lowerText = text.toLowerCase();
    const highImpactWords = ['surge', 'crash', 'milestone', 'record', 'breakthrough', 'major'];
    const mediumImpactWords = ['increase', 'decrease', 'new', 'launch', 'update'];
    
    if (highImpactWords.some(word => lowerText.includes(word))) return 'high';
    if (mediumImpactWords.some(word => lowerText.includes(word))) return 'medium';
    return 'low';
  }

  generateQuickTip(title, category) {
    const tips = {
      'base': 'Monitor Base DEX activity for new arbitrage routes and lower gas costs.',
      'defi': 'Watch for liquidity shifts that create temporary price imbalances.',
      'arbitrage': 'Use this information to refine your arbitrage detection algorithms.',
      'trading': 'Consider market timing and volatility patterns in your trading strategy.',
      'blockchain': 'Stay informed about infrastructure changes that might affect gas costs.'
    };
    
    return tips[category] || 'Stay updated on market developments that could create new opportunities.';
  }

  async analyzeNewsRelevance(args) {
    const { title, content } = args;
    
    // Simple relevance scoring based on keywords
    const arbitrageKeywords = ['arbitrage', 'mev', 'dex', 'price', 'spread', 'trading'];
    const text = (title + ' ' + content).toLowerCase();
    
    let relevanceScore = 0;
    arbitrageKeywords.forEach(keyword => {
      if (text.includes(keyword)) relevanceScore += 1;
    });
    
    const relevance = relevanceScore >= 3 ? 'high' : relevanceScore >= 1 ? 'medium' : 'low';
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          relevance,
          score: relevanceScore,
          maxScore: arbitrageKeywords.length,
          keywords_found: arbitrageKeywords.filter(keyword => text.includes(keyword)),
          recommendation: relevance === 'high' ? 'Feature prominently' : relevance === 'medium' ? 'Include with context' : 'Consider for background info'
        }, null, 2)
      }]
    };
  }

  async generateTradingTip(args) {
    const { news_content, category } = args;
    
    const tips = {
      'risk': [
        'Always set stop-losses for arbitrage positions, even on "guaranteed" trades.',
        'Never risk more than 2-3% of your portfolio on a single arbitrage opportunity.',
        'Monitor gas prices closely - high network congestion can eliminate arbitrage profits.',
        'Use multiple price sources to verify opportunities before executing trades.'
      ],
      'strategy': [
        'Focus on high-volume trading pairs for more predictable arbitrage opportunities.',
        'Consider using flash loans to maximize capital efficiency in arbitrage trades.',
        'Time your trades during high volatility periods for larger price spreads.',
        'Diversify across multiple DEXs and token pairs to reduce platform risk.'
      ],
      'technical': [
        'Use private mempools or MEV protection to prevent front-running on profitable trades.',
        'Optimize your smart contracts for gas efficiency to maintain thin profit margins.',
        'Implement automated monitoring systems for 24/7 opportunity detection.',
        'Consider batch transactions to reduce overall gas costs per trade.'
      ],
      'market': [
        'Monitor major news events that could trigger increased market volatility.',
        'Track DeFi protocol updates that might create temporary arbitrage windows.',
        'Watch for new token listings that often have initial price inefficiencies.',
        'Pay attention to market maker activities that might signal upcoming opportunities.'
      ]
    };
    
    const categoryTips = tips[category] || tips['strategy'];
    const selectedTip = categoryTips[Math.floor(Math.random() * categoryTips.length)];
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          tip: selectedTip,
          category,
          importance: 'high',
          timestamp: new Date().toISOString()
        }, null, 2)
      }]
    };
  }

  run() {
    console.error('ArbiTips News Server running on stdio');
    // Keep the process alive
    process.stdin.resume();
  }
}

if (require.main === module) {
  const server = new ArbiTipsNewsServer();
  server.run();
}

module.exports = { ArbiTipsNewsServer };