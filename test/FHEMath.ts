import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { FHEMath, FHEMath__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHEMath")) as FHEMath__factory;
  const fheMathContract = (await factory.deploy()) as FHEMath;
  const fheMathContractAddress = await fheMathContract.getAddress();

  return { fheMathContract, fheMathContractAddress };
}

describe("FHEMath", function () {
  let signers: Signers;
  let fheMathContract: FHEMath;
  let fheMathContractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ fheMathContract, fheMathContractAddress } = await deployFixture());
  });

  it("should add two encrypted numbers", async function () {
    const clearX = 10;
    const clearY = 20;
    const expectedResult = clearX + clearY;

    const encryptedInputX = await fhevm
      .createEncryptedInput(fheMathContractAddress, signers.alice.address)
      .add64(clearX)
      .encrypt();

    const encryptedInputY = await fhevm
      .createEncryptedInput(fheMathContractAddress, signers.alice.address)
      .add64(clearY)
      .encrypt();

    const tx = await fheMathContract
      .connect(signers.alice)
      .add(encryptedInputX.handles[0], encryptedInputX.inputProof, encryptedInputY.handles[0], encryptedInputY.inputProof);
    await tx.wait();

    const encryptedResult = await fheMathContract.res();
    const decryptedResult = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedResult,
      fheMathContractAddress,
      signers.alice,
    );

    expect(decryptedResult).to.eq(expectedResult);
  });

  it("should subtract two encrypted numbers", async function () {
    const clearX = 50;
    const clearY = 20;
    const expectedResult = clearX - clearY;

    const encryptedInputX = await fhevm
      .createEncryptedInput(fheMathContractAddress, signers.alice.address)
      .add64(clearX)
      .encrypt();

    const encryptedInputY = await fhevm
      .createEncryptedInput(fheMathContractAddress, signers.alice.address)
      .add64(clearY)
      .encrypt();

    const tx = await fheMathContract
      .connect(signers.alice)
      .sub(encryptedInputX.handles[0], encryptedInputX.inputProof, encryptedInputY.handles[0], encryptedInputY.inputProof);
    await tx.wait();

    const encryptedResult = await fheMathContract.res();
    const decryptedResult = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedResult,
      fheMathContractAddress,
      signers.alice,
    );

    expect(decryptedResult).to.eq(expectedResult);
  });

  it("should multiply two encrypted numbers", async function () {
    const clearX = 7;
    const clearY = 8;
    const expectedResult = clearX * clearY;

    const encryptedInputX = await fhevm
      .createEncryptedInput(fheMathContractAddress, signers.alice.address)
      .add64(clearX)
      .encrypt();

    const encryptedInputY = await fhevm
      .createEncryptedInput(fheMathContractAddress, signers.alice.address)
      .add64(clearY)
      .encrypt();

    const tx = await fheMathContract
      .connect(signers.alice)
      .mul(encryptedInputX.handles[0], encryptedInputX.inputProof, encryptedInputY.handles[0], encryptedInputY.inputProof);
    await tx.wait();

    const encryptedResult = await fheMathContract.res();
    const decryptedResult = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedResult,
      fheMathContractAddress,
      signers.alice,
    );

    expect(decryptedResult).to.eq(expectedResult);
  });

  it("should divide encrypted number by plaintext", async function () {
    const clearX = 100;
    const clearY = 5;
    const expectedResult = Math.floor(clearX / clearY);

    const encryptedInputX = await fhevm
      .createEncryptedInput(fheMathContractAddress, signers.alice.address)
      .add64(clearX)
      .encrypt();

    const tx = await fheMathContract
      .connect(signers.alice)
      .div(encryptedInputX.handles[0], encryptedInputX.inputProof, clearY);
    await tx.wait();

    const encryptedResult = await fheMathContract.res();
    const decryptedResult = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedResult,
      fheMathContractAddress,
      signers.alice,
    );

    expect(decryptedResult).to.eq(expectedResult);
  });

  it("should compute remainder of encrypted number divided by plaintext", async function () {
    const clearX = 23;
    const clearY = 5;
    const expectedResult = clearX % clearY;

    const encryptedInputX = await fhevm
      .createEncryptedInput(fheMathContractAddress, signers.alice.address)
      .add64(clearX)
      .encrypt();

    const tx = await fheMathContract
      .connect(signers.alice)
      .rem(encryptedInputX.handles[0], encryptedInputX.inputProof, clearY);
    await tx.wait();

    const encryptedResult = await fheMathContract.res();
    const decryptedResult = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedResult,
      fheMathContractAddress,
      signers.alice,
    );

    expect(decryptedResult).to.eq(expectedResult);
  });

  it("should handle edge case: division by non-zero divisor", async function () {
    const clearX = 17;
    const clearY = 3;
    const expectedResult = Math.floor(clearX / clearY);

    const encryptedInputX = await fhevm
      .createEncryptedInput(fheMathContractAddress, signers.alice.address)
      .add64(clearX)
      .encrypt();

    const tx = await fheMathContract
      .connect(signers.alice)
      .div(encryptedInputX.handles[0], encryptedInputX.inputProof, clearY);
    await tx.wait();

    const encryptedResult = await fheMathContract.res();
    const decryptedResult = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedResult,
      fheMathContractAddress,
      signers.alice,
    );

    expect(decryptedResult).to.eq(expectedResult);
  });

  it("should handle edge case: remainder with exact division", async function () {
    const clearX = 20;
    const clearY = 5;
    const expectedResult = clearX % clearY;

    const encryptedInputX = await fhevm
      .createEncryptedInput(fheMathContractAddress, signers.alice.address)
      .add64(clearX)
      .encrypt();

    const tx = await fheMathContract
      .connect(signers.alice)
      .rem(encryptedInputX.handles[0], encryptedInputX.inputProof, clearY);
    await tx.wait();

    const encryptedResult = await fheMathContract.res();
    const decryptedResult = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedResult,
      fheMathContractAddress,
      signers.alice,
    );

    expect(decryptedResult).to.eq(expectedResult);
  });

  it("should handle subtraction resulting in zero", async function () {
    const clearX = 42;
    const clearY = 42;
    const expectedResult = clearX - clearY;

    const encryptedInputX = await fhevm
      .createEncryptedInput(fheMathContractAddress, signers.alice.address)
      .add64(clearX)
      .encrypt();

    const encryptedInputY = await fhevm
      .createEncryptedInput(fheMathContractAddress, signers.alice.address)
      .add64(clearY)
      .encrypt();

    const tx = await fheMathContract
      .connect(signers.alice)
      .sub(encryptedInputX.handles[0], encryptedInputX.inputProof, encryptedInputY.handles[0], encryptedInputY.inputProof);
    await tx.wait();

    const encryptedResult = await fheMathContract.res();
    const decryptedResult = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedResult,
      fheMathContractAddress,
      signers.alice,
    );

    expect(decryptedResult).to.eq(expectedResult);
  });
});
