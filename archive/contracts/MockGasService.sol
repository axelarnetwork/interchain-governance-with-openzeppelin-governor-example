// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MockAxelarGasService {
    function payNativeGasForContractCall(
        address,
        string memory,
        string memory,
        bytes memory,
        address
    ) external payable {}
}
