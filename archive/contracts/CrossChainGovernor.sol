// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.20;

// // OpenZeppelin imports for governance functionality
// import "@openzeppelin/contracts/governance/Governor.sol";
// import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
// import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
// import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
// import "@openzeppelin/contracts/utils/Counters.sol";

// // Axelar imports for cross-chain functionality
// import "@axelar-network/axelar-gmp-sdk-solidity/contracts/executable/AxelarExecutable.sol";
// import "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGasService.sol";

// // Custom imports for interchain calls and proposal sending
// import "./InterchainCalls.sol";
// import "./InterchainProposalSender.sol";

// /// @title CrossChainGovernor
// /// @notice A governance contract that allows for cross-chain proposal execution
// /// @dev Inherits from OpenZeppelin's Governor contracts and Axelar's AxelarExecutable
// contract CrossChainGovernor is
//     Governor,
//     GovernorSettings,
//     GovernorCountingSimple,
//     GovernorVotes,
//     AxelarExecutable
// {
//     using Counters for Counters.Counter;

//     /// @notice The Axelar gas service for handling cross-chain gas payments
//     IAxelarGasService public immutable gasService;

//     /// @notice The contract responsible for sending cross-chain proposals
//     InterchainProposalSender public immutable proposalSender;

//     /// @notice The address of the threshold contract on the destination chain
//     address public thresholdAddr;

//     /// @notice Mapping to store whitelisted senders for each source chain
//     mapping(string => mapping(string => bool)) public whitelistedSenders;

//     /// @notice Counter for generating unique proposal IDs
//     Counters.Counter private _proposalIdCounter;

//     /// @notice Structure to store cross-chain proposal details
//     struct CrossChainProposal {
//         string destinationChain;
//         string destinationContract;
//         address thresholdContract;
//         uint256 newThreshold;
//     }

//     /// @notice Mapping to store cross-chain proposals by their ID
//     mapping(uint256 => CrossChainProposal) public crossChainProposals;

//     /// @notice Emitted when a new cross-chain proposal is created
//     event CrossChainProposalCreated(
//         uint256 proposalId,
//         string destinationChain,
//         string destinationContract,
//         uint256 newThreshold
//     );

//     /// @notice Emitted when a cross-chain proposal is sent for execution
//     event CrossChainProposalSent(
//         uint256 proposalId,
//         string destinationChain,
//         string destinationAddress,
//         bytes payload
//     );

//     /// @notice Emitted when a cross-chain proposal is executed on the destination chain
//     event CrossChainProposalExecuted(
//         string sourceChain,
//         string sourceAddress,
//         bytes payload
//     );

//     /// @notice Emitted when a sender's whitelist status is updated
//     event WhitelistedSenderSet(
//         string sourceChain,
//         string sourceSender,
//         bool whitelisted
//     );

//     /// @notice Error thrown when a proposal is received from a non-whitelisted source address
//     error NotWhitelistedSourceAddress();

//     /// @notice Error thrown when a proposal execution fails
//     error ProposalExecuteFailed();

//     /// @notice Initializes the CrossChainGovernor contract
//     /// @param _token The address of the governance token
//     /// @param _gateway The address of the Axelar gateway
//     /// @param _gasService The address of the Axelar gas service
//     /// @param _proposalSender The address of the InterchainProposalSender contract
//     /// @param _thresholdAddr The address of the threshold contract on the destination chain
//     constructor(
//         IVotes _token,
//         address _gateway,
//         address _gasService,
//         address _proposalSender,
//         address _thresholdAddr
//     )
//         Governor("CrossChainGovernor")
//         GovernorSettings(10 /* day */, 100 /* week */, 0)
//         GovernorVotes(_token)
//         AxelarExecutable(_gateway)
//     {
//         gasService = IAxelarGasService(_gasService);
//         proposalSender = InterchainProposalSender(_proposalSender);
//         thresholdAddr = _thresholdAddr;
//     }

//     /// @notice Sets the whitelist status for a proposal sender
//     /// @param sourceChain The name of the source chain
//     /// @param sourceSender The address of the sender to be whitelisted
//     /// @param whitelisted The new whitelist status
//     function setWhitelistedProposalSender(
//         string calldata sourceChain,
//         string calldata sourceSender,
//         bool whitelisted
//     ) external onlyGovernance {
//         whitelistedSenders[sourceChain][sourceSender] = whitelisted;
//         emit WhitelistedSenderSet(sourceChain, sourceSender, whitelisted);
//     }

//     /// @notice Creates a new cross-chain proposal to update the threshold
//     /// @param destinationChain The name of the destination chain
//     /// @param destinationContract The address of the contract on the destination chain
//     /// @param thresholdContract The address of the threshold contract
//     /// @param newThreshold The proposed new threshold value
//     /// @return The ID of the newly created proposal
//     function proposeUpdateThreshold(
//         string memory destinationChain,
//         string memory destinationContract,
//         address thresholdContract,
//         uint256 newThreshold
//     ) public returns (uint256) {
//         uint256 proposalId = _proposalIdCounter.current();
//         _proposalIdCounter.increment();

//         crossChainProposals[proposalId] = CrossChainProposal(
//             destinationChain,
//             destinationContract,
//             thresholdContract,
//             newThreshold
//         );

//         emit CrossChainProposalCreated(
//             proposalId,
//             destinationChain,
//             destinationContract,
//             newThreshold
//         );

//         return proposalId;
//     }

//     /// @notice Executes an approved cross-chain proposal
//     /// @param proposalId The ID of the proposal to be executed
//     function executeApprovedProposal(uint256 proposalId) public payable {
//         require(
//             state(proposalId) == ProposalState.Succeeded,
//             "Proposal must be succeeded"
//         );

//         CrossChainProposal memory proposal = crossChainProposals[proposalId];

//         InterchainCalls.Call[] memory calls = new InterchainCalls.Call[](1);
//         calls[0] = InterchainCalls.Call({
//             target: proposal.thresholdContract,
//             value: 0,
//             callData: abi.encodeWithSignature(
//                 "updateThreshold(uint256)",
//                 proposal.newThreshold
//             )
//         });

//         proposalSender.sendProposal{value: msg.value}(
//             proposal.destinationChain,
//             proposal.destinationContract,
//             calls
//         );

//         emit CrossChainProposalSent(
//             proposalId,
//             proposal.destinationChain,
//             proposal.destinationContract,
//             abi.encode(calls)
//         );
//     }

//     /// @notice Executes a cross-chain call received from another chain
//     /// @param sourceChain The name of the source chain
//     /// @param sourceAddress The address of the sender on the source chain
//     /// @param payload The encoded payload containing the calls to be executed
//     function _execute(
//         string calldata sourceChain,
//         string calldata sourceAddress,
//         bytes calldata payload
//     ) internal override {
//         if (!whitelistedSenders[sourceChain][sourceAddress]) {
//             revert NotWhitelistedSourceAddress();
//         }

//         (bytes memory sourceCaller, InterchainCalls.Call[] memory calls) = abi
//             .decode(payload, (bytes, InterchainCalls.Call[]));

//         _executeProposal(calls);

//         emit CrossChainProposalExecuted(sourceChain, sourceAddress, payload);
//     }

//     /// @notice Executes the calls in a cross-chain proposal
//     /// @param calls An array of calls to be executed
//     function _executeProposal(InterchainCalls.Call[] memory calls) internal {
//         uint256 length = calls.length;

//         for (uint256 i = 0; i < length; i++) {
//             InterchainCalls.Call memory call = calls[i];
//             (bool success, bytes memory result) = call.target.call{
//                 value: call.value
//             }(call.callData);

//             if (!success) {
//                 revert ProposalExecuteFailed();
//             }
//         }
//     }

//     /// @notice Returns the quorum required for a proposal to pass
//     /// @dev This is set to 1 for demonstration purposes
//     /// @return The quorum value
//     function quorum(uint256) public pure override returns (uint256) {
//         return 1; // A basic quorum of 1 for demo
//     }

//     /// @notice Returns the voting period duration
//     /// @return The number of blocks in the voting period
//     function votingPeriod()
//         public
//         view
//         override(IGovernor, GovernorSettings)
//         returns (uint256)
//     {
//         return super.votingPeriod();
//     }

//     /// @notice Returns the proposal threshold
//     /// @return The minimum number of votes required to create a proposal
//     function proposalThreshold()
//         public
//         view
//         override(Governor, GovernorSettings)
//         returns (uint256)
//     {
//         return super.proposalThreshold();
//     }
// }

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@axelar-network/axelar-gmp-sdk-solidity/contracts/executable/AxelarExecutable.sol";
import "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGasService.sol";
import "./InterchainCalls.sol";
import "./InterchainProposalSender.sol";

contract CrossChainGovernor is
    Governor,
    GovernorCountingSimple,
    GovernorVotes,
    AxelarExecutable
{
    IAxelarGasService public immutable gasService;
    InterchainProposalSender public immutable proposalSender;
    mapping(string => mapping(string => bool)) public whitelistedSenders;
    mapping(string => mapping(bytes => bool)) public whitelistedCallers;

    struct ThresholdProposal {
        string destinationChain;
        string destinationContract;
        address thresholdContract;
        uint256 newThreshold;
    }

    mapping(uint256 => ThresholdProposal) public thresholdProposals;

    event ThresholdProposalCreated(
        uint256 proposalId,
        string destinationChain,
        string destinationContract,
        address thresholdContract,
        uint256 newThreshold
    );

    event WhitelistedCallerSet(
        string sourceChain,
        bytes sourceCaller,
        bool whitelisted
    );

    event ProposalExecuted(bytes32 indexed proposalHash);

    event WhitelistedSenderSet(
        string sourceChain,
        string sourceSender,
        bool whitelisted
    );

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

    function votingDelay() public pure override returns (uint256) {
        return 1; // 1 block
    }

    function votingPeriod() public pure override returns (uint256) {
        return 50400; // 1 week
    }

    function quorum(uint256) public pure override returns (uint256) {
        return 1e18; // 1 token
    }

    function setWhitelistedProposalSender(
        string calldata sourceChain,
        string calldata sourceSender,
        bool whitelisted
    ) external onlyGovernance {
        whitelistedSenders[sourceChain][sourceSender] = whitelisted;
        emit WhitelistedSenderSet(sourceChain, sourceSender, whitelisted);
    }

    function setWhitelistedProposalCaller(
        string calldata sourceChain,
        bytes memory sourceCaller,
        bool whitelisted
    ) external onlyGovernance {
        whitelistedCallers[sourceChain][sourceCaller] = whitelisted;
        emit WhitelistedCallerSet(sourceChain, sourceCaller, whitelisted);
    }

    function proposeThresholdUpdate(
        string memory destinationChain,
        string memory destinationContract,
        address thresholdContract,
        uint256 newThreshold
    ) public returns (uint256) {
        uint256 proposalId = hashProposal(
            new address[](0),
            new uint256[](0),
            new bytes[](0),
            keccak256(
                abi.encode(
                    destinationChain,
                    destinationContract,
                    thresholdContract,
                    newThreshold
                )
            )
        );

        thresholdProposals[proposalId] = ThresholdProposal(
            destinationChain,
            destinationContract,
            thresholdContract,
            newThreshold
        );

        emit ThresholdProposalCreated(
            proposalId,
            destinationChain,
            destinationContract,
            thresholdContract,
            newThreshold
        );

        return proposalId;
    }

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

        proposalSender.sendProposal{value: msg.value}(
            proposal.destinationChain,
            proposal.destinationContract,
            calls
        );
    }

    function _execute(
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes calldata payload
    ) internal override {
        require(
            whitelistedSenders[sourceChain][sourceAddress],
            "Not whitelisted sender"
        );

        (bytes memory sourceCaller, InterchainCalls.Call[] memory calls) = abi
            .decode(payload, (bytes, InterchainCalls.Call[]));

        require(
            whitelistedCallers[sourceChain][sourceCaller],
            "Not whitelisted caller"
        );

        for (uint256 i = 0; i < calls.length; i++) {
            InterchainCalls.Call memory call = calls[i];
            (bool success, ) = call.target.call{value: call.value}(
                call.callData
            );
            require(success, "Call failed");
        }

        bytes32 proposalHash = keccak256(
            abi.encode(sourceChain, sourceAddress, sourceCaller, payload)
        );
        emit ProposalExecuted(proposalHash);
    }
}
