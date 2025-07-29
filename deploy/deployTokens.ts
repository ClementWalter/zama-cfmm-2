import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Deploy Token A
  const deployedZama = await deploy("Zama", {
    contract: "EncryptedToken",
    from: deployer,
    args: ["Zama", "ZAMA"],
    log: true,
  });

  console.log(`Zama contract: `, deployedZama.address);

  // Deploy Token B
  const deployedKakarot = await deploy("Kakarot", {
    contract: "EncryptedToken",
    from: deployer,
    args: ["Kakarot", "KKRT"],
    log: true,
  });

  console.log(`Kakarot contract: `, deployedKakarot.address);
};

export default func;
func.id = "deploy_tokens";
func.tags = ["EncryptedToken", "Tokens"];
