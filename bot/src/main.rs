use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Mutex;
use serde::{Deserialize, Serialize};
use reqwest::Client;
use ethers::prelude::*;
use ethers::providers::{Provider, Http};
use ethers::types::{Address, U256, TransactionRequest};
use tokio_tungstenite::{connect_async, tungstenite::Message};
use futures_util::{SinkExt, StreamExt};
use std::collections::HashMap;

// Configuration
#[derive(Debug, Clone, Deserialize)]
struct Config {
    base_rpc_url: String,
    private_key: String,
    contract_address: String,
    binance_ws_url: String,
    backpack_ws_url: String,
    min_profit_threshold: f64,
    max_gas_price: u64,
    max_slippage: f64,
}

// Price data structures
#[derive(Debug, Clone, Serialize, Deserialize)]
struct DEXPrice {
    venue: String,
    token_pair: String,
    price: f64,
    liquidity: f64,
    timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CEXOrderBook {
    exchange: String,
    symbol: String,
    bids: Vec<(f64, f64)>, // (price, quantity)
    asks: Vec<(f64, f64)>, // (price, quantity)
    timestamp: u64,
}

#[derive(Debug, Clone)]
struct ArbitrageOpportunity {
    id: String,
    strategy: String,
    buy_venue: String,
    sell_venue: String,
    buy_price: f64,
    sell_price: f64,
    spread: f64,
    estimated_profit: f64,
    confidence: f64,
    trade_size: f64,
    gas_estimate: u64,
    timestamp: u64,
}

// Main arbitrage bot
struct ArbitrageBot {
    config: Config,
    provider: Arc<Provider<Http>>,
    wallet: LocalWallet,
    client: Client,
    dex_prices: Arc<Mutex<HashMap<String, DEXPrice>>>,
    cex_prices: Arc<Mutex<HashMap<String, CEXOrderBook>>>,
    opportunities: Arc<Mutex<Vec<ArbitrageOpportunity>>>,
    metrics: Arc<Mutex<BotMetrics>>,
}

#[derive(Debug, Default)]
struct BotMetrics {
    total_trades: u64,
    successful_trades: u64,
    total_profit: f64,
    total_volume: f64,
    avg_execution_time: f64,
    gas_used: u64,
}

impl ArbitrageBot {
    async fn new(config: Config) -> Result<Self, Box<dyn std::error::Error>> {
        // Initialize Ethereum provider
        let provider = Arc::new(Provider::<Http>::try_from(&config.base_rpc_url)?);
        
        // Initialize wallet
        let wallet: LocalWallet = config.private_key.parse()?;
        let wallet = wallet.with_chain_id(8453u64); // Base mainnet chain ID
        
        // Initialize HTTP client
        let client = Client::new();
        
        Ok(ArbitrageBot {
            config,
            provider,
            wallet,
            client,
            dex_prices: Arc::new(Mutex::new(HashMap::new())),
            cex_prices: Arc::new(Mutex::new(HashMap::new())),
            opportunities: Arc::new(Mutex::new(Vec::new())),
            metrics: Arc::new(Mutex::new(BotMetrics::default())),
        })
    }

    // Main bot execution loop
    async fn run(&self) -> Result<(), Box<dyn std::error::Error>> {
        println!("🚀 Starting ArbiTips Bot...");
        
        // Start price feed monitoring
        let dex_prices = Arc::clone(&self.dex_prices);
        let cex_prices = Arc::clone(&self.cex_prices);
        let config = self.config.clone();
        let client = self.client.clone();
        let provider = Arc::clone(&self.provider);

        // Start DEX price monitoring
        let dex_task = tokio::spawn(async move {
            Self::monitor_dex_prices(provider, dex_prices).await;
        });

        // Start Binance WebSocket
        let binance_prices = Arc::clone(&self.cex_prices);
        let binance_config = config.clone();
        let binance_task = tokio::spawn(async move {
            Self::monitor_binance_ws(binance_config.binance_ws_url, binance_prices).await;
        });

        // Start Backpack WebSocket (mock for now)
        let backpack_prices = Arc::clone(&self.cex_prices);
        let backpack_task = tokio::spawn(async move {
            Self::monitor_backpack_ws(backpack_prices).await;
        });

        // Start opportunity detection
        let opportunities = Arc::clone(&self.opportunities);
        let dex_prices_ref = Arc::clone(&self.dex_prices);
        let cex_prices_ref = Arc::clone(&self.cex_prices);
        let detection_config = self.config.clone();
        let detection_task = tokio::spawn(async move {
            Self::detect_opportunities(
                dex_prices_ref,
                cex_prices_ref,
                opportunities,
                detection_config,
            ).await;
        });

        // Start execution engine
        let execution_opportunities = Arc::clone(&self.opportunities);
        let execution_provider = Arc::clone(&self.provider);
        let execution_wallet = self.wallet.clone();
        let execution_config = self.config.clone();
        let execution_metrics = Arc::clone(&self.metrics);
        let execution_task = tokio::spawn(async move {
            Self::execute_arbitrage(
                execution_opportunities,
                execution_provider,
                execution_wallet,
                execution_config,
                execution_metrics,
            ).await;
        });

        // Start metrics reporting
        let metrics_ref = Arc::clone(&self.metrics);
        let metrics_task = tokio::spawn(async move {
            Self::report_metrics(metrics_ref).await;
        });

        // Wait for all tasks
        tokio::try_join!(
            dex_task,
            binance_task,
            backpack_task,
            detection_task,
            execution_task,
            metrics_task
        )?;

        Ok(())
    }

    // Monitor DEX prices via Base RPC calls
    async fn monitor_dex_prices(
        provider: Arc<Provider<Http>>,
        dex_prices: Arc<Mutex<HashMap<String, DEXPrice>>>,
    ) {
        let mut interval = tokio::time::interval(Duration::from_secs(5));
        
        loop {
            interval.tick().await;
            
            // Fetch prices from different DEXs
            let timestamp = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs();

            // Mock DEX price fetching (in production, call actual DEX contracts)
            let mock_prices = vec![
                DEXPrice {
                    venue: "uniswap-v3-500".to_string(),
                    token_pair: "WETH/USDC".to_string(),
                    price: 2500.0 + (rand::random::<f64>() - 0.5) * 10.0,
                    liquidity: 50000.0,
                    timestamp,
                },
                DEXPrice {
                    venue: "uniswap-v3-3000".to_string(),
                    token_pair: "WETH/USDC".to_string(),
                    price: 2501.0 + (rand::random::<f64>() - 0.5) * 8.0,
                    liquidity: 25000.0,
                    timestamp,
                },
                DEXPrice {
                    venue: "aerodrome".to_string(),
                    token_pair: "WETH/USDC".to_string(),
                    price: 2499.5 + (rand::random::<f64>() - 0.5) * 12.0,
                    liquidity: 10000.0,
                    timestamp,
                },
                DEXPrice {
                    venue: "sushiswap".to_string(),
                    token_pair: "WETH/USDC".to_string(),
                    price: 2502.0 + (rand::random::<f64>() - 0.5) * 15.0,
                    liquidity: 15000.0,
                    timestamp,
                },
            ];

            // Update price cache
            let mut prices = dex_prices.lock().await;
            for price in mock_prices {
                prices.insert(price.venue.clone(), price);
            }

            println!("📊 Updated DEX prices: {} venues", prices.len());
        }
    }

    // Monitor Binance WebSocket for real-time order book updates
    async fn monitor_binance_ws(
        ws_url: String,
        cex_prices: Arc<Mutex<HashMap<String, CEXOrderBook>>>,
    ) {
        loop {
            match connect_async(&ws_url).await {
                Ok((ws_stream, _)) => {
                    println!("🔗 Connected to Binance WebSocket");
                    let (mut ws_sender, mut ws_receiver) = ws_stream.split();

                    // Subscribe to ETHUSDC depth stream
                    let subscribe_msg = r#"{"method":"SUBSCRIBE","params":["ethusdc@depth"],"id":1}"#;
                    if let Err(e) = ws_sender.send(Message::Text(subscribe_msg.to_string())).await {
                        println!("❌ Failed to subscribe to Binance stream: {}", e);
                        continue;
                    }

                    // Process messages
                    while let Some(message) = ws_receiver.next().await {
                        match message {
                            Ok(Message::Text(text)) => {
                                if let Ok(order_book) = Self::parse_binance_depth(&text) {
                                    let mut prices = cex_prices.lock().await;
                                    prices.insert("binance".to_string(), order_book);
                                }
                            },
                            Err(e) => {
                                println!("❌ Binance WebSocket error: {}", e);
                                break;
                            }
                            _ => {}
                        }
                    }
                }
                Err(e) => {
                    println!("❌ Failed to connect to Binance WebSocket: {}", e);
                    tokio::time::sleep(Duration::from_secs(5)).await;
                }
            }
        }
    }

    // Mock Backpack WebSocket monitoring
    async fn monitor_backpack_ws(cex_prices: Arc<Mutex<HashMap<String, CEXOrderBook>>>) {
        let mut interval = tokio::time::interval(Duration::from_secs(3));
        
        loop {
            interval.tick().await;
            
            let timestamp = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs();

            // Mock Backpack order book
            let order_book = CEXOrderBook {
                exchange: "backpack".to_string(),
                symbol: "ETHUSDC".to_string(),
                bids: vec![
                    (2499.5 + (rand::random::<f64>() - 0.5) * 2.0, 10.5),
                    (2499.0 + (rand::random::<f64>() - 0.5) * 2.0, 25.2),
                ],
                asks: vec![
                    (2500.5 + (rand::random::<f64>() - 0.5) * 2.0, 12.1),
                    (2501.0 + (rand::random::<f64>() - 0.5) * 2.0, 18.7),
                ],
                timestamp,
            };

            let mut prices = cex_prices.lock().await;
            prices.insert("backpack".to_string(), order_book);
        }
    }

    // Detect arbitrage opportunities
    async fn detect_opportunities(
        dex_prices: Arc<Mutex<HashMap<String, DEXPrice>>>,
        cex_prices: Arc<Mutex<HashMap<String, CEXOrderBook>>>,
        opportunities: Arc<Mutex<Vec<ArbitrageOpportunity>>>,
        config: Config,
    ) {
        let mut interval = tokio::time::interval(Duration::from_millis(500));
        
        loop {
            interval.tick().await;
            
            let dex_map = dex_prices.lock().await.clone();
            let cex_map = cex_prices.lock().await.clone();
            
            let mut new_opportunities = Vec::new();
            let timestamp = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs();

            // DEX to CEX opportunities
            for (dex_name, dex_price) in &dex_map {
                for (cex_name, cex_book) in &cex_map {
                    if let Some(best_bid) = cex_book.bids.first() {
                        let spread = best_bid.0 - dex_price.price;
                        let spread_pct = (spread / dex_price.price) * 100.0;
                        
                        if spread_pct > 0.1 { // Min 0.1% spread
                            let trade_size = (dex_price.liquidity * 0.1).min(best_bid.1 * best_bid.0);
                            let estimated_profit = trade_size * spread_pct / 100.0;
                            
                            if estimated_profit > config.min_profit_threshold {
                                let opportunity = ArbitrageOpportunity {
                                    id: format!("{}-{}-{}", dex_name, cex_name, timestamp),
                                    strategy: "dex-to-cex".to_string(),
                                    buy_venue: dex_name.clone(),
                                    sell_venue: cex_name.clone(),
                                    buy_price: dex_price.price,
                                    sell_price: best_bid.0,
                                    spread: spread_pct,
                                    estimated_profit,
                                    confidence: Self::calculate_confidence(spread_pct, trade_size),
                                    trade_size,
                                    gas_estimate: 250000,
                                    timestamp,
                                };
                                
                                new_opportunities.push(opportunity);
                            }
                        }
                    }
                }
            }

            // Update opportunities
            let mut opps = opportunities.lock().await;
            opps.clear();
            opps.extend(new_opportunities.clone());
            opps.sort_by(|a, b| b.estimated_profit.partial_cmp(&a.estimated_profit).unwrap());
            opps.truncate(10); // Keep top 10 opportunities

            if !new_opportunities.is_empty() {
                println!("🎯 Found {} arbitrage opportunities", new_opportunities.len());
                for opp in new_opportunities.iter().take(3) {
                    println!("   {} -> {} | Spread: {:.2}% | Profit: ${:.2}",
                        opp.buy_venue, opp.sell_venue, opp.spread, opp.estimated_profit);
                }
            }
        }
    }

    // Execute arbitrage trades
    async fn execute_arbitrage(
        opportunities: Arc<Mutex<Vec<ArbitrageOpportunity>>>,
        provider: Arc<Provider<Http>>,
        wallet: LocalWallet,
        config: Config,
        metrics: Arc<Mutex<BotMetrics>>,
    ) {
        let mut interval = tokio::time::interval(Duration::from_millis(100));
        
        loop {
            interval.tick().await;
            
            let best_opportunity = {
                let opps = opportunities.lock().await;
                opps.first().cloned()
            };
            
            if let Some(opp) = best_opportunity {
                if opp.confidence > 0.8 && opp.estimated_profit > config.min_profit_threshold {
                    println!("🚀 Executing arbitrage: {} -> {} | ${:.2} profit",
                        opp.buy_venue, opp.sell_venue, opp.estimated_profit);
                    
                    let start_time = std::time::Instant::now();
                    
                    match Self::execute_trade(&opp, &provider, &wallet, &config).await {
                        Ok(tx_hash) => {
                            let execution_time = start_time.elapsed().as_millis() as f64;
                            println!("✅ Trade executed successfully: 0x{:x}", tx_hash);
                            
                            // Update metrics
                            let mut m = metrics.lock().await;
                            m.total_trades += 1;
                            m.successful_trades += 1;
                            m.total_profit += opp.estimated_profit;
                            m.total_volume += opp.trade_size;
                            m.avg_execution_time = (m.avg_execution_time * (m.successful_trades - 1) as f64 + execution_time) / m.successful_trades as f64;
                            m.gas_used += opp.gas_estimate;
                        }
                        Err(e) => {
                            println!("❌ Trade execution failed: {}", e);
                            let mut m = metrics.lock().await;
                            m.total_trades += 1;
                        }
                    }
                    
                    // Remove executed opportunity
                    let mut opps = opportunities.lock().await;
                    opps.retain(|o| o.id != opp.id);
                }
            }
        }
    }

    // Execute individual trade on smart contract
    async fn execute_trade(
        opportunity: &ArbitrageOpportunity,
        provider: &Arc<Provider<Http>>,
        wallet: &LocalWallet,
        config: &Config,
    ) -> Result<H256, Box<dyn std::error::Error>> {
        let contract_address: Address = config.contract_address.parse()?;
        let client = SignerMiddleware::new(provider.clone(), wallet.clone());
        
        // Build transaction data for smart contract call
        let gas_price = provider.get_gas_price().await?;
        if gas_price.as_u64() > config.max_gas_price {
            return Err("Gas price too high".into());
        }
        
        // Mock transaction (in production, encode actual contract call)
        let tx = TransactionRequest::new()
            .to(contract_address)
            .gas(U256::from(opportunity.gas_estimate))
            .gas_price(gas_price)
            .value(U256::zero());
            
        let tx_hash = client.send_transaction(tx, None).await?
            .await?
            .unwrap()
            .transaction_hash;
            
        Ok(tx_hash)
    }

    // Report performance metrics
    async fn report_metrics(metrics: Arc<Mutex<BotMetrics>>) {
        let mut interval = tokio::time::interval(Duration::from_secs(60));
        
        loop {
            interval.tick().await;
            
            let m = metrics.lock().await;
            println!("\n📊 === ARBITRAGE BOT METRICS ===");
            println!("Total Trades: {}", m.total_trades);
            println!("Successful: {} ({:.1}%)", m.successful_trades,
                if m.total_trades > 0 { (m.successful_trades as f64 / m.total_trades as f64) * 100.0 } else { 0.0 });
            println!("Total Profit: ${:.2}", m.total_profit);
            println!("Total Volume: ${:.2}", m.total_volume);
            println!("Avg Execution: {:.1}ms", m.avg_execution_time);
            println!("Gas Used: {}", m.gas_used);
            println!("================================\n");
        }
    }

    // Helper functions
    fn parse_binance_depth(text: &str) -> Result<CEXOrderBook, Box<dyn std::error::Error>> {
        let parsed: serde_json::Value = serde_json::from_str(text)?;
        
        let bids = parsed["b"].as_array()
            .unwrap_or(&vec![])
            .iter()
            .take(5)
            .filter_map(|bid| {
                if let [price, qty] = bid.as_array()?.as_slice() {
                    Some((price.as_str()?.parse().ok()?, qty.as_str()?.parse().ok()?))
                } else { None }
            })
            .collect();
            
        let asks = parsed["a"].as_array()
            .unwrap_or(&vec![])
            .iter()
            .take(5)
            .filter_map(|ask| {
                if let [price, qty] = ask.as_array()?.as_slice() {
                    Some((price.as_str()?.parse().ok()?, qty.as_str()?.parse().ok()?))
                } else { None }
            })
            .collect();
            
        Ok(CEXOrderBook {
            exchange: "binance".to_string(),
            symbol: "ETHUSDC".to_string(),
            bids,
            asks,
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
        })
    }
    
    fn calculate_confidence(spread_pct: f64, trade_size: f64) -> f64 {
        let mut confidence = 0.5;
        
        if spread_pct > 0.5 { confidence += 0.2; }
        if spread_pct > 1.0 { confidence += 0.1; }
        if trade_size > 10000.0 { confidence += 0.1; }
        if trade_size > 25000.0 { confidence += 0.1; }
        
        confidence.min(1.0)
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Load configuration
    let config = Config {
        base_rpc_url: "https://mainnet.base.org".to_string(),
        private_key: std::env::var("PRIVATE_KEY")
            .unwrap_or_else(|_| "your_private_key_here".to_string()),
        contract_address: "0x1234567890123456789012345678901234567890".to_string(), // Deploy address
        binance_ws_url: "wss://stream.binance.com:9443/ws/ethusdc@depth".to_string(),
        backpack_ws_url: "wss://backpack-api.com/ws".to_string(), // Mock
        min_profit_threshold: 50.0, // $50
        max_gas_price: 50_000_000_000, // 50 gwei
        max_slippage: 1.0, // 1%
    };
    
    // Initialize and run bot
    let bot = ArbitrageBot::new(config).await?;
    bot.run().await?;
    
    Ok(())
}