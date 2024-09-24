// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Import necessary OpenZeppelin and Axelar contracts
import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@axelar-network/axelar-gmp-sdk-solidity/contracts/executable/AxelarExecutable.sol";
import "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGasService.sol";
import "./InterchainCalls.sol";
import "./InterchainProposalSender.sol";

/**
 * @title CrossChainGovernor
 * @dev A governance contract that enables cross-chain proposal creation and execution using Axelar Network.
 * @notice This contract allows for creating and executing threshold update proposals across different blockchain networks.
 */
contract CrossChainGovernor is
    Governor,
    GovernorCountingSimple,
    GovernorVotes,
    AxelarExecutable
{
    // Axelar gas service for cross-chain transactions
    IAxelarGasService public immutable gasService;
    // Contract for sending interchain proposals
    InterchainProposalSender public immutable proposalSender;

    // Mappings to store whitelisted senders and callers for cross-chain governance
    mapping(string => mapping(string => bool)) public whitelistedSenders;
    mapping(string => mapping(bytes => bool)) public whitelistedCallers;

    // Structure to store threshold proposal details
    struct ThresholdProposal {
        string destinationChain;
        string destinationContract;
        address thresholdContract;
        uint256 newThreshold;
    }

    // Mapping to store threshold proposals
    mapping(uint256 => ThresholdProposal) public thresholdProposals;

    /**
     * @dev Emitted when a threshold proposal is created.
     * @param proposalId The ID of the created proposal.
     * @param destinationChain The target blockchain for the proposal.
     * @param destinationContract The address of the contract on the destination chain.
     * @param thresholdContract The address of the threshold contract.
     * @param newThreshold The proposed new threshold value.
     */
    event ThresholdProposalCreated(
        uint256 proposalId,
        string destinationChain,
        string destinationContract,
        address thresholdContract,
        uint256 newThreshold
    );

    /**
     * @dev Emitted when a whitelisted caller is set.
     * @param sourceChain The source blockchain of the caller.
     * @param sourceCaller The address of the caller.
     * @param whitelisted The whitelist status of the caller.
     */
    event WhitelistedCallerSet(
        string sourceChain,
        bytes sourceCaller,
        bool whitelisted
    );

    /**
     * @dev Emitted when a cross-chain proposal is executed.
     * @param proposalHash The unique hash of the executed proposal.
     */
    event CrossChainProposalExecuted(bytes32 indexed proposalHash);

    /**
     * @dev Emitted when a threshold proposal is executed.
     * @param proposalId The ID of the executed proposal.
     */
    event ThresholdProposalExecuted(uint256 indexed proposalId);

    /**
     * @dev Emitted when a whitelisted sender is set.
     * @param sourceChain The source blockchain of the sender.
     * @param sourceSender The address of the sender.
     * @param whitelisted The whitelist status of the sender.
     */
    event WhitelistedSenderSet(
        string sourceChain,
        string sourceSender,
        bool whitelisted
    );

    /**
     * @dev Constructor to initialize the CrossChainGovernor contract.
     * @param _name The name of the governor.
     * @param _token The voting token address.
     * @param _gateway The Axelar gateway address.
     * @param _gasService The Axelar gas service address.
     * @param _proposalSender The address of the InterchainProposalSender contract.
     */
    constructor(
        string memory _name,
        IVotes _token,
        address _gateway,
        address _gasService,
        address _proposalSender
    ) Governor(_name) GovernorVotes(_token) AxelarExecutable(_gateway) {
        gasService = IAxelarGasService(_gasService);
        proposalSender = InterchainProposalSender(_proposalSender);
    }

    /**
     * @dev Returns the voting delay.
     * @return The number of blocks between proposal creation and voting start.
     */
    function votingDelay() public pure override returns (uint256) {
        return 1;
    }

    /**
     * @dev Returns the voting period.
     * @return The number of blocks for the voting period.
     */
    function votingPeriod() public pure override returns (uint256) {
        return 50400;
    }

    /**
     * @dev Returns the quorum required for a proposal to pass.
     * @return The minimum number of votes required for a quorum.
     */
    function quorum(uint256) public pure override returns (uint256) {
        return 1e18;
    }

    /**
     * @dev Sets a whitelisted proposal sender.
     * @param sourceChain The source blockchain of the sender.
     * @param sourceSender The address of the sender to be whitelisted.
     * @param whitelisted The whitelist status to be set.
     */
    function setWhitelistedProposalSender(
        string calldata sourceChain,
        string calldata sourceSender,
        bool whitelisted
    ) external onlyGovernance {
        whitelistedSenders[sourceChain][sourceSender] = whitelisted;
        emit WhitelistedSenderSet(sourceChain, sourceSender, whitelisted);
    }

    /**
     * @dev Sets a whitelisted proposal caller.
     * @param sourceChain The source blockchain of the caller.
     * @param sourceCaller The address of the caller to be whitelisted.
     * @param whitelisted The whitelist status to be set.
     */
    function setWhitelistedProposalCaller(
        string calldata sourceChain,
        bytes memory sourceCaller,
        bool whitelisted
    ) external onlyGovernance {
        whitelistedCallers[sourceChain][sourceCaller] = whitelisted;
        emit WhitelistedCallerSet(sourceChain, sourceCaller, whitelisted);
    }

    /**
     * @dev Proposes a threshold update.
     * @param destinationChain The target blockchain for the proposal.
     * @param destinationContract The address of the contract on the destination chain.
     * @param thresholdContract The address of the threshold contract.
     * @param newThreshold The proposed new threshold value.
     * @return proposalId The ID of the created proposal.
     */
    function proposeThresholdUpdate(
        string memory destinationChain,
        string memory destinationContract,
        address thresholdContract,
        uint256 newThreshold
    ) public returns (uint256 proposalId) {
        // Create proposal parameters
        address[] memory targets = new address[](1);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);

        targets[0] = thresholdContract;
        values[0] = 0;
        calldatas[0] = abi.encodeWithSignature(
            "updateThreshold(uint256)",
            newThreshold
        );

        // Create the proposal
        proposalId = propose(
            targets,
            values,
            calldatas,
            "Proposal to update the threshold contract"
        );

        // Store the threshold proposal details
        thresholdProposals[proposalId] = ThresholdProposal({
            destinationChain: destinationChain,
            destinationContract: destinationContract,
            thresholdContract: thresholdContract,
            newThreshold: newThreshold
        });

        // Emit event for threshold proposal creation
        emit ThresholdProposalCreated(
            proposalId,
            destinationChain,
            destinationContract,
            thresholdContract,
            newThreshold
        );

        return proposalId;
    }

    /**
     * @dev Executes a threshold proposal.
     * @param proposalId The ID of the proposal to be executed.
     */
    function executeThresholdProposal(uint256 proposalId) public payable {
        require(
            state(proposalId) == ProposalState.Succeeded,
            "Proposal must be succeeded"
        );
        ThresholdProposal memory proposal = thresholdProposals[proposalId];
        InterchainCalls.Call[] memory calls = new InterchainCalls.Call[](1);
        calls[0] = InterchainCalls.Call({
            target: proposal.thresholdContract,
            value: 0,
            callData: abi.encodeWithSignature(
                "updateThreshold(uint256)",
                proposal.newThreshold
            )
        });

        // Send the proposal to the destination chain
        proposalSender.sendProposal{value: msg.value}(
            proposal.destinationChain,
            proposal.destinationContract,
            calls
        );

        // Execute the proposal on the current chain
        super.execute(
            _getProposalTargets(proposalId),
            _getProposalValues(),
            _getProposalCalldatas(proposalId),
            keccak256(bytes("Proposal to update the threshold contract"))
        );

        // Emit event for threshold proposal execution
        emit ThresholdProposalExecuted(proposalId);
    }

    /**
     * @dev Internal function to get proposal targets.
     * @param proposalId The ID of the proposal.
     * @return An array of target addresses for the proposal.
     */
    function _getProposalTargets(
        uint256 proposalId
    ) internal view returns (address[] memory) {
        address[] memory targets = new address[](1);
        targets[0] = thresholdProposals[proposalId].thresholdContract;
        return targets;
    }

    /**
     * @dev Internal function to get proposal values.
     * @return An array of values for the proposal (always 0 in this case).
     */
    function _getProposalValues() internal pure returns (uint256[] memory) {
        uint256[] memory values = new uint256[](1);
        values[0] = 0;
        return values;
    }

    /**
     * @dev Internal function to get proposal calldatas.
     * @param proposalId The ID of the proposal.
     * @return An array of calldata for the proposal.
     */
    function _getProposalCalldatas(
        uint256 proposalId
    ) internal view returns (bytes[] memory) {
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature(
            "updateThreshold(uint256)",
            thresholdProposals[proposalId].newThreshold
        );
        return calldatas;
    }

    /**
     * @dev Internal function to execute cross-chain calls.
     * @param sourceChain The source blockchain of the call.
     * @param sourceAddress The address of the sender on the source chain.
     * @param payload The payload of the cross-chain call.
     */
    function _execute(
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes calldata payload
    ) internal override {
        // Check if the sender is whitelisted
        require(
            whitelistedSenders[sourceChain][sourceAddress],
            "Not whitelisted sender"
        );

        // Decode the payload
        (bytes memory sourceCaller, InterchainCalls.Call[] memory calls) = abi
            .decode(payload, (bytes, InterchainCalls.Call[]));

        // Check if the caller is whitelisted
        require(
            whitelistedCallers[sourceChain][sourceCaller],
            "Not whitelisted caller"
        );

        // Execute each call in the payload
        for (uint256 i = 0; i < calls.length; i++) {
            InterchainCalls.Call memory call = calls[i];
            (bool success, ) = call.target.call{value: call.value}(
                call.callData
            );
            require(success, "Call failed");
        }

        // Generate a unique hash for the cross-chain proposal
        bytes32 proposalHash = keccak256(
            abi.encode(sourceChain, sourceAddress, sourceCaller, payload)
        );
        // Emit event for cross-chain proposal execution
        emit CrossChainProposalExecuted(proposalHash);
    }
}
