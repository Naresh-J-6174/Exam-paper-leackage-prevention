const hre = require("hardhat");

async function main() {
  const Registry = await hre.ethers.getContractFactory("ExamPaperRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log("\n✅ ExamPaperRegistry deployed to:", address);
  console.log("\nAdd this to your Next.js app's .env.local:");
  console.log(`CONTRACT_ADDRESS=${address}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
