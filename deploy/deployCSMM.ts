import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { ethers } = hre;
  const { deploy, get } = hre.deployments;

  // Get deployed token addresses
  const zamaContract = await get("Zama");
  const kakarotContract = await get("Kakarot");

  // Deploy FHECSMM
  const deployedFHEPair = await deploy("FHECSMM", {
    from: deployer,
    args: [zamaContract.address, kakarotContract.address],
    log: true,
  });

  console.log(`FHECSMM contract: `, deployedFHEPair.address);
  console.log(`  Zama: `, zamaContract.address);
  console.log(`  Kakarot: `, kakarotContract.address);

  const zama = await ethers.getContractAt("FHEToken", zamaContract.address);
  const kakarot = await ethers.getContractAt("FHEToken", kakarotContract.address);
  await zama.setOperator(deployedFHEPair.address, 2 ** 48 - 1);
  console.log(`  Zama is operator: `, await zama.isOperator(deployer, deployedFHEPair.address));
  await kakarot.setOperator(deployedFHEPair.address, 2 ** 48 - 1);
  console.log(`  Kakarot is operator: `, await kakarot.isOperator(deployer, deployedFHEPair.address));
};

export default func;
func.id = "deploy_pair";
func.tags = ["FHECSMM"];
func.dependencies = ["Tokens"]; // Ensure tokens are deployed first
