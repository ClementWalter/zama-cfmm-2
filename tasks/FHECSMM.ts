import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:swap", "Swaps tokens")
  .addParam("amount0", "The amount of token0 to swap")
  .addParam("amount1", "The amount of token1 to swap")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const signers = await ethers.getSigners();
    const recipient = signers[0].address;

    const csmmContract = await deployments.get("FHECSMM");
    const csmm = await ethers.getContractAt("FHECSMM", csmmContract.address);

    const encryptedAmount0 = await fhevm
      .createEncryptedInput(csmmContract.address, recipient)
      .add64(taskArguments.amount0)
      .encrypt();
    console.log(`Encrypted amount0:`, encryptedAmount0);

    const encryptedAmount1 = await fhevm
      .createEncryptedInput(csmmContract.address, recipient)
      .add64(taskArguments.amount1)
      .encrypt();
    console.log(`Encrypted amount1:`, encryptedAmount1);

    const tx = await csmm.swap(
      encryptedAmount0.handles[0],
      encryptedAmount0.inputProof,
      encryptedAmount1.handles[0],
      encryptedAmount1.inputProof,
    );
    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
  });

task("task:addLiquidity", "Adds liquidity")
  .addParam("amount0", "The amount of token0 to add")
  .addParam("amount1", "The amount of token1 to add")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const signers = await ethers.getSigners();
    const recipient = signers[0].address;

    const csmmContract = await deployments.get("FHECSMM");
    const csmm = await ethers.getContractAt("FHECSMM", csmmContract.address);

    const encryptedAmount0 = await fhevm
      .createEncryptedInput(csmmContract.address, recipient)
      .add64(taskArguments.amount0)
      .encrypt();
    console.log(`Encrypted amount0:`, encryptedAmount0);

    const encryptedAmount1 = await fhevm
      .createEncryptedInput(csmmContract.address, recipient)
      .add64(taskArguments.amount1)
      .encrypt();
    console.log(`Encrypted amount1:`, encryptedAmount1);

    const tx = await csmm.addLiquidity(
      encryptedAmount0.handles[0],
      encryptedAmount0.inputProof,
      encryptedAmount1.handles[0],
      encryptedAmount1.inputProof,
    );
    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    const balance = await csmm.balanceOf(recipient);
    console.log(`balance:`, balance.toString());

    const reserve0 = await csmm.reserve0();
    console.log(`reserve0:`, reserve0.toString());

    const reserve1 = await csmm.reserve1();
    console.log(`reserve1:`, reserve1.toString());
  });
