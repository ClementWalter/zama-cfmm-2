import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedFHEMath = await deploy("FHEMath", {
    from: deployer,
    log: true,
  });

  console.log(`FHEMath contract: `, deployedFHEMath.address);
};
export default func;
func.id = "deploy_fheMath"; // id required to prevent re-execution
func.tags = ["FHEMath"];
