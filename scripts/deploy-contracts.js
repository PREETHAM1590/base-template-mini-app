const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
    console.log('🚀 Deploying ArbiTips contracts to Base network...');
    console.log('================================================');
    
    const [deployer] = await ethers.getSigners();
    console.log('👤 Deploying with account:', deployer.address);
    console.log('💰 Account balance:', (await deployer.getBalance()).toString());
    
    // Base network contract addresses
    const BASE_ADDRESSES = {
        WETH: '0x4200000000000000000000000000000000000006',
        USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        UNISWAP_V3_ROUTER: '0x2626664c2603336E57B271c5C0b26F421741e481',
        SUSHISWAP_ROUTER: '0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891',
        AERODROME_ROUTER: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43',
        MULTICALL: '0xcA11bde05977b3631167028862bE2a173976CA11'
    };
    
    try {
        // 1. Deploy CEX Bridge
        console.log('📦 Deploying CEX Bridge...');
        const CEXBridge = await ethers.getContractFactory('CEXBridge');
        const cexBridge = await CEXBridge.deploy();
        await cexBridge.deployed();
        console.log('✅ CEX Bridge deployed at:', cexBridge.address);
        
        // Configure supported tokens in CEX Bridge
        console.log('⚙️ Configuring CEX Bridge tokens...');
        await cexBridge.addSupportedToken(BASE_ADDRESSES.WETH);
        await cexBridge.addSupportedToken(BASE_ADDRESSES.USDC);
        
        // 2. Deploy Arbitrage Executor
        console.log('📦 Deploying Arbitrage Executor...');
        const ArbitrageExecutor = await ethers.getContractFactory('ArbitrageExecutor');
        const arbitrageExecutor = await ArbitrageExecutor.deploy(
            BASE_ADDRESSES.WETH, // WETH address
            cexBridge.address,   // CEX Bridge address
            [
                BASE_ADDRESSES.UNISWAP_V3_ROUTER,
                BASE_ADDRESSES.SUSHISWAP_ROUTER,
                BASE_ADDRESSES.AERODROME_ROUTER
            ]
        );
        await arbitrageExecutor.deployed();
        console.log('✅ Arbitrage Executor deployed at:', arbitrageExecutor.address);
        
        // 3. Configure DEX routers in Arbitrage Executor
        console.log('⚙️ Configuring DEX routers...');
        await arbitrageExecutor.addDEXRouter('uniswap-v3', BASE_ADDRESSES.UNISWAP_V3_ROUTER);
        await arbitrageExecutor.addDEXRouter('sushiswap', BASE_ADDRESSES.SUSHISWAP_ROUTER);
        await arbitrageExecutor.addDEXRouter('aerodrome', BASE_ADDRESSES.AERODROME_ROUTER);
        
        // 4. Set up permissions
        console.log('🔐 Setting up permissions...');
        await cexBridge.setExecutor(arbitrageExecutor.address, true);
        
        // 5. Save deployment addresses
        const deploymentInfo = {
            network: 'base',
            deployer: deployer.address,
            timestamp: new Date().toISOString(),
            contracts: {
                CEXBridge: cexBridge.address,
                ArbitrageExecutor: arbitrageExecutor.address
            },
            configuration: {
                supportedTokens: [
                    BASE_ADDRESSES.WETH,
                    BASE_ADDRESSES.USDC
                ],
                dexRouters: {
                    'uniswap-v3': BASE_ADDRESSES.UNISWAP_V3_ROUTER,
                    'sushiswap': BASE_ADDRESSES.SUSHISWAP_ROUTER,
                    'aerodrome': BASE_ADDRESSES.AERODROME_ROUTER
                }
            },
            gasUsed: {
                CEXBridge: (await cexBridge.deployTransaction.wait()).gasUsed.toString(),
                ArbitrageExecutor: (await arbitrageExecutor.deployTransaction.wait()).gasUsed.toString()
            }
        };
        
        // Save to file
        const deploymentsPath = path.join(__dirname, '..', 'deployments', 'base.json');
        fs.mkdirSync(path.dirname(deploymentsPath), { recursive: true });
        fs.writeFileSync(deploymentsPath, JSON.stringify(deploymentInfo, null, 2));
        
        // Update environment file
        const envPath = path.join(__dirname, '..', '.env.local');
        let envContent = '';
        if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf8');
        }
        
        // Update or add contract addresses
        const addressUpdates = [
            ['NEXT_PUBLIC_ARBITRAGE_EXECUTOR_ADDRESS', arbitrageExecutor.address],
            ['NEXT_PUBLIC_CEX_BRIDGE_ADDRESS', cexBridge.address]
        ];
        
        addressUpdates.forEach(([key, value]) => {
            const regex = new RegExp(`^${key}=.*$`, 'm');
            if (regex.test(envContent)) {
                envContent = envContent.replace(regex, `${key}=${value}`);
            } else {
                envContent += `\n${key}=${value}`;
            }
        });
        
        fs.writeFileSync(envPath, envContent);
        
        console.log('\n🎉 Deployment completed successfully!');
        console.log('📝 Contract addresses saved to:', deploymentsPath);
        console.log('🔧 Environment file updated:', envPath);
        console.log('\n📋 Deployment Summary:');
        console.log('=====================');
        console.log('CEX Bridge:', cexBridge.address);
        console.log('Arbitrage Executor:', arbitrageExecutor.address);
        console.log('\n⚠️  Next steps:');
        console.log('1. Verify contracts on Basescan');
        console.log('2. Fund the contracts with initial liquidity');
        console.log('3. Test the arbitrage functionality');
        console.log('4. Start the production monitoring system');
        
    } catch (error) {
        console.error('❌ Deployment failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { main };
