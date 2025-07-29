import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, get } = hre.deployments;

  // Get deployed token addresses
  const zama = await get("Zama");
  const kakarot = await get("Kakarot");

  // Deploy FHEPair
  const deployedFHEPair = await deploy("FHEPair", {
    from: deployer,
    args: [zama.address, kakarot.address],
    log: true,
  });

  console.log(`FHEPair contract: `, deployedFHEPair.address);
  console.log(`  Zama: `, zama.address);
  console.log(`  Kakarot: `, kakarot.address);
};

export default func;
func.id = "deploy_pair";
func.tags = ["FHEPair"];
func.dependencies = ["Tokens"]; // Ensure tokens are deployed first
