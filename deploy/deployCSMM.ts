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
  const deployedFHECSMM = await deploy("FHECSMM", {
    from: deployer,
    args: [zamaContract.address, kakarotContract.address],
    log: true,
  });

  console.log(`FHECSMM contract: `, deployedFHECSMM.address);
  console.log(`  Zama: `, zamaContract.address);
  console.log(`  Kakarot: `, kakarotContract.address);

  const zama = await ethers.getContractAt("FHEToken", zamaContract.address);
  const kakarot = await ethers.getContractAt("FHEToken", kakarotContract.address);
  let tx = await zama.setOperator(deployedFHECSMM.address, 2 ** 48 - 1);
  await tx.wait();
  console.log(` FHECSMM is operator for Zama: `, await zama.isOperator(deployedFHECSMM.address, deployer));
  tx = await kakarot.setOperator(deployedFHECSMM.address, 2 ** 48 - 1);
  await tx.wait();
  console.log(` FHECSMM is operator for Kakarot: `, await kakarot.isOperator(deployedFHECSMM.address, deployer));
};

export default func;
func.id = "deploy_pair";
func.tags = ["FHECSMM"];
func.dependencies = ["Tokens"]; // Ensure tokens are deployed first
