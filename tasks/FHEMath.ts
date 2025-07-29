import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:add", "Adds two numbers")
  .addOptionalParam("address", "Optionally specify the FHEMath contract address")
  .addParam("x", "The first number")
  .addParam("y", "The second number")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const fheMath = taskArguments.address ? { address: taskArguments.address } : await deployments.get("FHEMath");

    const signers = await ethers.getSigners();

    const fheMathContract = await ethers.getContractAt("FHEMath", fheMath.address);

    const encryptedX = await fhevm
      .createEncryptedInput(fheMath.address, signers[0].address)
      .add64(taskArguments.x)
      .encrypt();
    console.log("Encrypted x: " + encryptedX);
    const encryptedY = await fhevm
      .createEncryptedInput(fheMath.address, signers[0].address)
      .add64(taskArguments.y)
      .encrypt();
    console.log("Encrypted y: " + encryptedY);

    const tx = await fheMathContract.add(
      encryptedX.handles[0],
      encryptedX.inputProof,
      encryptedY.handles[0],
      encryptedY.inputProof,
    );
    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    const encryptedResult = await fheMathContract.res();

    const clearResult = await fhevm.userDecryptEuint(FhevmType.euint64, encryptedResult, fheMath.address, signers[0]);

    console.log("Encrypted result: " + encryptedResult);
    console.log("Clear result: " + clearResult);
    console.log(`Expected result: ${Number(taskArguments.x) + Number(taskArguments.y)}`);
  });

task("task:sub", "Subtracts two numbers")
  .addOptionalParam("address", "Optionally specify the FHEMath contract address")
  .addParam("x", "The first number")
  .addParam("y", "The second number")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const fheMath = taskArguments.address ? { address: taskArguments.address } : await deployments.get("FHEMath");

    const signers = await ethers.getSigners();

    const fheMathContract = await ethers.getContractAt("FHEMath", fheMath.address);

    const encryptedX = await fhevm
      .createEncryptedInput(fheMath.address, signers[0].address)
      .add64(taskArguments.x)
      .encrypt();
    console.log("Encrypted x: " + encryptedX);
    const encryptedY = await fhevm
      .createEncryptedInput(fheMath.address, signers[0].address)
      .add64(taskArguments.y)
      .encrypt();
    console.log("Encrypted y: " + encryptedY);

    const tx = await fheMathContract.sub(
      encryptedX.handles[0],
      encryptedX.inputProof,
      encryptedY.handles[0],
      encryptedY.inputProof,
    );
    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    const encryptedResult = await fheMathContract.res();

    const clearResult = await fhevm.userDecryptEuint(FhevmType.euint64, encryptedResult, fheMath.address, signers[0]);

    console.log("Encrypted result: " + encryptedResult);
    console.log("Clear result: " + clearResult);
    console.log(`Expected result: ${Number(taskArguments.x) - Number(taskArguments.y)}`);
  });

task("task:mul", "Multiplies two numbers")
  .addOptionalParam("address", "Optionally specify the FHEMath contract address")
  .addParam("x", "The first number")
  .addParam("y", "The second number")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const fheMath = taskArguments.address ? { address: taskArguments.address } : await deployments.get("FHEMath");

    const signers = await ethers.getSigners();

    const fheMathContract = await ethers.getContractAt("FHEMath", fheMath.address);

    const encryptedX = await fhevm
      .createEncryptedInput(fheMath.address, signers[0].address)
      .add64(taskArguments.x)
      .encrypt();
    console.log("Encrypted x: " + encryptedX);
    const encryptedY = await fhevm
      .createEncryptedInput(fheMath.address, signers[0].address)
      .add64(taskArguments.y)
      .encrypt();
    console.log("Encrypted y: " + encryptedY);

    const tx = await fheMathContract.mul(
      encryptedX.handles[0],
      encryptedX.inputProof,
      encryptedY.handles[0],
      encryptedY.inputProof,
    );
    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    const encryptedResult = await fheMathContract.res();

    const clearResult = await fhevm.userDecryptEuint(FhevmType.euint64, encryptedResult, fheMath.address, signers[0]);

    console.log("Encrypted result: " + encryptedResult);
    console.log("Clear result: " + clearResult);
    console.log(`Expected result: ${Number(taskArguments.x) * Number(taskArguments.y)}`);
  });

task("task:div", "Divides two numbers")
  .addOptionalParam("address", "Optionally specify the FHEMath contract address")
  .addParam("x", "The first number")
  .addParam("y", "The second number")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const fheMath = taskArguments.address ? { address: taskArguments.address } : await deployments.get("FHEMath");

    const signers = await ethers.getSigners();

    const fheMathContract = await ethers.getContractAt("FHEMath", fheMath.address);

    const encryptedX = await fhevm
      .createEncryptedInput(fheMath.address, signers[0].address)
      .add64(taskArguments.x)
      .encrypt();
    console.log("Encrypted x: " + encryptedX);

    const tx = await fheMathContract.div(encryptedX.handles[0], encryptedX.inputProof, taskArguments.y);
    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    const encryptedResult = await fheMathContract.res();

    const clearResult = await fhevm.userDecryptEuint(FhevmType.euint64, encryptedResult, fheMath.address, signers[0]);

    console.log("Encrypted result: " + encryptedResult);
    console.log("Clear result: " + clearResult);
    console.log(`Expected result: ${Number(taskArguments.x) / Number(taskArguments.y)}`);
  });

task("task:rem", "Remains two numbers")
  .addOptionalParam("address", "Optionally specify the FHEMath contract address")
  .addParam("x", "The first number")
  .addParam("y", "The second number")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const fheMath = taskArguments.address ? { address: taskArguments.address } : await deployments.get("FHEMath");

    const signers = await ethers.getSigners();

    const fheMathContract = await ethers.getContractAt("FHEMath", fheMath.address);

    const encryptedX = await fhevm
      .createEncryptedInput(fheMath.address, signers[0].address)
      .add64(taskArguments.x)
      .encrypt();
    console.log("Encrypted x: " + encryptedX);

    const tx = await fheMathContract.rem(encryptedX.handles[0], encryptedX.inputProof, taskArguments.y);
    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    const encryptedResult = await fheMathContract.res();

    const clearResult = await fhevm.userDecryptEuint(FhevmType.euint64, encryptedResult, fheMath.address, signers[0]);

    console.log("Encrypted result: " + encryptedResult);
    console.log("Clear result: " + clearResult);
    console.log(`Expected result: ${Number(taskArguments.x) % Number(taskArguments.y)}`);
  });
