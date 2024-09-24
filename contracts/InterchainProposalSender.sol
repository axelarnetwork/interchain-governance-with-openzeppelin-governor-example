// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IAxelarGateway} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGateway.sol";
import {IAxelarGasService} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGasService.sol";
import "./InterchainCalls.sol";

/// @title InterchainProposalSender
/// @notice This contract sends cross-chain proposals using the Axelar network
contract InterchainProposalSender {
    IAxelarGateway public immutable gateway;
    IAxelarGasService public immutable gasService;

    error InvalidAddress();
    error InvalidFee();

    /// @notice Initializes the contract with Axelar Gateway and Gas Service addresses
    /// @param _gateway Address of the Axelar Gateway
    /// @param _gasService Address of the Axelar Gas Service
    constructor(address _gateway, address _gasService) {
        if (_gateway == address(0) || _gasService == address(0))
            revert InvalidAddress();
        gateway = IAxelarGateway(_gateway);
        gasService = IAxelarGasService(_gasService);
    }

    /// @notice Sends a proposal to another chain
    /// @param destinationChain The name of the destination chain
    /// @param destinationContract The address of the contract on the destination chain
    /// @param calls An array of calls to be executed on the destination chain
    function sendProposal(
        string memory destinationChain,
        string memory destinationContract,
        InterchainCalls.Call[] calldata calls
    ) external payable {
        require(msg.value > 0, "Gas payment is required");
        bytes memory payload = abi.encode(abi.encodePacked(msg.sender), calls);

        gasService.payNativeGasForContractCall{value: msg.value}(
            address(this),
            destinationChain,
            destinationContract,
            payload,
            msg.sender
        );
        gateway.callContract(destinationChain, destinationContract, payload);
    }
}