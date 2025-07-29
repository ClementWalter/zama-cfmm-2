import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:mintTokens", "Mints tokens to the first address")
  .addOptionalParam("name", "The name of the token")
  .addParam("amount", "The amount of tokens to mint")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const tokenContract = await deployments.get(taskArguments.name || "Zama");

    const signers = await ethers.getSigners();
    const recipient = signers[0].address;

    const token = await ethers.getContractAt("EncryptedToken", tokenContract.address);

    const encryptedAmount = await fhevm
      .createEncryptedInput(tokenContract.address, recipient)
      .add64(taskArguments.amount)
      .encrypt();
    console.log(`Encrypted amount:`, encryptedAmount);

    const tx = await token.mint(recipient, encryptedAmount.handles[0], encryptedAmount.inputProof);
    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    console.log(`Minted ${taskArguments.amount} tokens to ${recipient}`);

    const balance = await token.confidentialBalanceOf(recipient);
    console.log("Balance: " + balance);
    const clearBalance = await fhevm.userDecryptEuint(FhevmType.euint64, balance, tokenContract.address, signers[0]);
    console.log(`Balance of ${recipient}: ${clearBalance}`);
  });

task("task:burnTokens", "Burns tokens from the first address")
  .addOptionalParam("name", "The name of the token")
  .addParam("amount", "The amount of tokens to burn")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const tokenContract = await deployments.get(taskArguments.name || "Zama");

    const signers = await ethers.getSigners();
    const recipient = signers[0].address;

    const token = await ethers.getContractAt("EncryptedToken", tokenContract.address);

    const encryptedAmount = await fhevm
      .createEncryptedInput(tokenContract.address, recipient)
      .add64(taskArguments.amount)
      .encrypt();
    console.log(`Encrypted amount:`, encryptedAmount);

    const tx = await token.burn(recipient, encryptedAmount.handles[0], encryptedAmount.inputProof);
    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    console.log(`Burned ${taskArguments.amount} tokens from ${recipient}`);

    const balance = await token.confidentialBalanceOf(recipient);
    console.log("Balance: " + balance);
    const clearBalance = await fhevm.userDecryptEuint(FhevmType.euint64, balance, tokenContract.address, signers[0]);
    console.log(`Balance of ${recipient}: ${clearBalance}`);
  });
