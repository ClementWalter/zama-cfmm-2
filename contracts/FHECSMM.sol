// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {FHE, euint64, ebool, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {IConfidentialFungibleToken} from
    "@openzeppelin/confidential-contracts/interfaces/IConfidentialFungibleToken.sol";
import {ConfidentialFungibleToken} from "@openzeppelin/confidential-contracts/token/ConfidentialFungibleToken.sol";

contract FHECSMM is SepoliaConfig, ConfidentialFungibleToken {
    using FHE for euint64;
    using FHE for ebool;

    IConfidentialFungibleToken public immutable token0;
    IConfidentialFungibleToken public immutable token1;

    euint64 public reserve0;
    euint64 public reserve1;

    uint256 public totalSupply;
    mapping(address => euint64) public balanceOf;

    constructor(address _token0, address _token1) ConfidentialFungibleToken("FHECSMM", "FHECSMM", "FHECSMM") {
        token0 = IConfidentialFungibleToken(_token0);
        token1 = IConfidentialFungibleToken(_token1);
    }

    function _update(euint64 _res0, euint64 _res1) private {
        reserve0 = _res0;
        reserve1 = _res1;
    }

    function swap(
        externalEuint64 _amount0,
        bytes calldata _inputProof0,
        externalEuint64 _amount1,
        bytes calldata _inputProof1
    ) external {
        euint64 amount0 = FHE.fromExternal(_amount0, _inputProof0);
        euint64 amount1 = FHE.fromExternal(_amount1, _inputProof1);
        FHE.allowTransient(amount0, address(token0));
        FHE.allowTransient(amount1, address(token1));

        euint64 received0 = token0.confidentialTransferFrom(msg.sender, address(this), amount0);
        euint64 received0MinusFee = received0.mul(997).div(1000);
        FHE.allowTransient(received0MinusFee, address(token1));
        euint64 sent1 = token1.confidentialTransfer(msg.sender, received0MinusFee);

        euint64 received1 = token1.confidentialTransferFrom(msg.sender, address(this), amount1);
        euint64 received1MinusFee = received1.mul(997).div(1000);
        FHE.allowTransient(received1MinusFee, address(token0));
        euint64 sent0 = token0.confidentialTransfer(msg.sender, received1MinusFee);

        _update(reserve0.add(received0).sub(sent0), reserve1.add(received1).sub(sent1));
    }

    function addLiquidity(
        externalEuint64 _amount0,
        bytes calldata _inputProof0,
        externalEuint64 _amount1,
        bytes calldata _inputProof1
    ) external {
        euint64 amount0 = FHE.fromExternal(_amount0, _inputProof0);
        euint64 amount1 = FHE.fromExternal(_amount1, _inputProof1);
        FHE.allowTransient(amount0, address(token0));
        FHE.allowTransient(amount1, address(token1));

        amount0 = token0.confidentialTransferFrom(msg.sender, address(this), amount0);
        amount1 = token1.confidentialTransferFrom(msg.sender, address(this), amount1);

        _mint(msg.sender, amount0.add(amount1));

        _update(reserve0.add(amount0), reserve1.add(amount1));
    }

    function removeLiquidity(
        externalEuint64 _shares,
        bytes calldata _inputProof,
        externalEuint64 _amount0Out,
        bytes calldata _inputProof0,
        externalEuint64 _amount1Out,
        bytes calldata _inputProof1
    ) external {
        euint64 shares = FHE.fromExternal(_shares, _inputProof);
        FHE.allowTransient(shares, address(this));
        // Use the actual transferred shares instead of the claimed shares
        shares = _burn(msg.sender, shares);

        euint64 amount0Out = FHE.fromExternal(_amount0Out, _inputProof0);
        euint64 amount1Out = FHE.fromExternal(_amount1Out, _inputProof1);
        FHE.allowTransient(amount0Out, address(token0));
        FHE.allowTransient(amount1Out, address(token1));

        ebool isSplitValid = amount0Out.add(amount1Out).eq(shares);
        ebool isAmount0Valid = reserve0.sub(amount0Out).ge(0);
        ebool isAmount1Valid = reserve1.sub(amount1Out).ge(0);

        euint64 isValid = isSplitValid.and(isAmount0Valid).and(isAmount1Valid).asEuint64();
        amount0Out = amount0Out.mul(isValid);
        amount1Out = amount1Out.mul(isValid);
        FHE.allowTransient(amount0Out, address(token0));
        FHE.allowTransient(amount1Out, address(token1));

        _update(reserve0.sub(amount0Out), reserve1.sub(amount1Out));

        token0.confidentialTransfer(msg.sender, amount0Out);
        token1.confidentialTransfer(msg.sender, amount1Out);
    }
}
