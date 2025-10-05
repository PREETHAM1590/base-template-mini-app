const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying ArbiTips contracts to Base network...");
  
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  
  // Treasury address (in production, use a multisig)
  const treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
  console.log("Treasury address:", treasuryAddress);
  
  // Deploy CEX Bridge first
  console.log("Deploying CEX Bridge...");
  const CEXBridge = await ethers.getContractFactory("CEXBridge");
  const cexBridge = await CEXBridge.deploy(deployer.address); // Deployer as initial operator
  
  await cexBridge.deployed();
  console.log("CEX Bridge deployed to:", cexBridge.address);
  
  // Configure CEX Bridge with supported tokens
  await cexBridge.setSupportedToken("0x4200000000000000000000000000000000000006", true); // WETH on Base
  await cexBridge.setSupportedToken("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", true); // USDC on Base
  console.log("CEX Bridge configured with WETH and USDC support");
  
  // Deploy ArbitrageExecutor
  const ArbitrageExecutor = await ethers.getContractFactory("ArbitrageExecutor");
  const arbitrageExecutor = await ArbitrageExecutor.deploy(
    "0xE592427A0AEce92De3Edee1F18E0157C05861564", // Uniswap V3 Router
    cexBridge.address, // CEX Bridge
    "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43", // Aerodrome Router  
    "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"  // SushiSwap Router
  );
  
  await arbitrageExecutor.deployed();
  console.log("ArbitrageExecutor deployed to:", arbitrageExecutor.address);
  
  // Set up authorized routers (Base network DEX routers)
  const routers = [
    "0xE592427A0AEce92De3Edee1F18E0157C05861564", // Uniswap V3 Router
    "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506", // SushiSwap Router
    "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43", // Aerodrome Router
  ];
  
  console.log("Setting up authorized routers...");
  
  for (const router of routers) {
    await arbitrageExecutor.setAuthorizedRouter(router, true);
    console.log(`Authorized router: ${router}`);
  }
  
  // Set initial parameters
  await arbitrageExecutor.setMinProfitThreshold(ethers.utils.parseEther("0.001")); // 0.001 ETH
  await arbitrageExecutor.setMaxSlippage(500); // 5%
  await arbitrageExecutor.setTreasuryFee(100); // 1%
  
  console.log("Initial parameters set.");
  
  // Verify deployment
  console.log("\n=== Deployment Summary ===");
  console.log("Network:", await ethers.provider.getNetwork());
  console.log("Deployer:", deployer.address);
  console.log("Treasury:", treasuryAddress);
  console.log("ArbitrageExecutor:", arbitrageExecutor.address);
  console.log("Gas Used:", (await arbitrageExecutor.deployTransaction.wait()).gasUsed.toString());
  
  // Save deployment info
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId,
    deployer: deployer.address,
    treasury: treasuryAddress,
    contracts: {
      ArbitrageExecutor: arbitrageExecutor.address,
    },
    authorizedRouters: routers,
    timestamp: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber(),
  };
  
  console.log("\n=== Contract Addresses for Frontend ===");
  console.log("Add these to your .env file:");
  console.log(`NEXT_PUBLIC_ARBITRAGE_EXECUTOR_ADDRESS=${arbitrageExecutor.address}`);
  console.log(`NEXT_PUBLIC_TREASURY_ADDRESS=${treasuryAddress}`);
  
  // For Base mainnet, log verification command
  if ((await ethers.provider.getNetwork()).chainId === 8453) {
    console.log("\n=== Verification Command ===");
    console.log("Run this command to verify the contract:");
    console.log(`npx hardhat verify --network base ${arbitrageExecutor.address} ${treasuryAddress}`);
  }
  
  return deploymentInfo;
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then((deploymentInfo) => {
    console.log("\nDeployment completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Deployment failed:");
    console.error(error);
    process.exit(1);
  });