// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract FHEMath is SepoliaConfig {
    euint64 public res;

    function add(externalEuint64 x, bytes calldata xProof, externalEuint64 y, bytes calldata yProof) public {
        euint64 encryptedX = FHE.fromExternal(x, xProof);
        euint64 encryptedY = FHE.fromExternal(y, yProof);
        res = FHE.add(encryptedX, encryptedY);
        FHE.allow(res, address(this));
        FHE.allow(res, msg.sender);
    }

    function sub(externalEuint64 x, bytes calldata xProof, externalEuint64 y, bytes calldata yProof) public {
        euint64 encryptedX = FHE.fromExternal(x, xProof);
        euint64 encryptedY = FHE.fromExternal(y, yProof);
        res = FHE.sub(encryptedX, encryptedY);
        FHE.allow(res, address(this));
        FHE.allow(res, msg.sender);
    }

    function mul(externalEuint64 x, bytes calldata xProof, externalEuint64 y, bytes calldata yProof) public {
        euint64 encryptedX = FHE.fromExternal(x, xProof);
        euint64 encryptedY = FHE.fromExternal(y, yProof);
        res = FHE.mul(encryptedX, encryptedY);
        FHE.allow(res, address(this));
        FHE.allow(res, msg.sender);
    }

    function div(externalEuint64 x, bytes calldata xProof, uint64 y) public {
        euint64 encryptedX = FHE.fromExternal(x, xProof);
        res = FHE.div(encryptedX, y);
        FHE.allow(res, address(this));
        FHE.allow(res, msg.sender);
    }

    function rem(externalEuint64 x, bytes calldata xProof, uint64 y) public {
        euint64 encryptedX = FHE.fromExternal(x, xProof);
        res = FHE.rem(encryptedX, y);
        FHE.allow(res, address(this));
        FHE.allow(res, msg.sender);
    }
}
