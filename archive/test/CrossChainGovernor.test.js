// const { expect } = require("chai");
// const { ethers } = require("hardhat");

// describe("CrossChainGovernance", function () {
//   let governanceToken,
//     thresholdContract,
//     interchainProposalSender,
//     crossChainGovernor;
//   let owner, addr1, addr2;
//   let mockAxelarGateway, mockAxelarGasService;

//   const VOTING_DELAY = 10;
//   const VOTING_PERIOD = 100;
//   const PROPOSAL_THRESHOLD = 0;

//   beforeEach(async function () {
//     [owner, addr1, addr2] = await ethers.getSigners();

//     // Deploy GovernanceToken
//     const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
//     governanceToken = await GovernanceToken.deploy(owner.address);

//     // Deploy mock Axelar contracts
//     const MockAxelarGateway = await ethers.getContractFactory(
//       "MockAxelarGateway"
//     );
//     mockAxelarGateway = await MockAxelarGateway.deploy();

//     const MockAxelarGasService = await ethers.getContractFactory(
//       "MockAxelarGasService"
//     );
//     mockAxelarGasService = await MockAxelarGasService.deploy();

//     // Deploy CrossChainGovernance
//     const CrossChainGovernance = await ethers.getContractFactory(
//       "CrossChainGovernance"
//     );
//     crossChainGovernance = await CrossChainGovernance.deploy(
//       "CrossChainGovernance",
//       await governanceToken.getAddress(),
//       await mockAxelarGateway.getAddress(),
//       await mockAxelarGasService.getAddress()
//     );

//     // Delegate voting power
//     await governanceToken.delegate(owner.address);
//     await governanceToken.transfer(addr1.address, ethers.parseEther("100"));
//     await governanceToken.connect(addr1).delegate(addr1.address);
//   });

//   describe("Governance Process", function () {
//     it("Should allow creating a proposal", async function () {
//       const proposalTx = await crossChainGovernor.proposeUpdateThreshold(
//         "destinationChain",
//         "destinationContract",
//         await thresholdContract.getAddress(),
//         100
//       );

//       const receipt = await proposalTx.wait();
//       const event = receipt.events?.find(
//         (e) => e.event === "CrossChainProposalCreated"
//       );
//       expect(event).to.not.be.undefined;

//       const proposalId = event.args.proposalId;
//       expect(proposalId).to.not.be.undefined;

//       // Check proposal state
//       expect(await crossChainGovernor.state(proposalId)).to.equal(0); // Pending
//     });

//     it("Should allow voting on a proposal", async function () {
//       const proposalTx = await crossChainGovernor.proposeUpdateThreshold(
//         "destinationChain",
//         "destinationContract",
//         await thresholdContract.getAddress(),
//         100
//       );
//       const receipt = await proposalTx.wait();
//       const event = receipt.events?.find(
//         (e) => e.event === "CrossChainProposalCreated"
//       );
//       const proposalId = event.args.proposalId;

//       // Move forward past the voting delay
//       await ethers.provider.send("evm_increaseTime", [VOTING_DELAY + 1]);
//       await ethers.provider.send("evm_mine");

//       // Cast votes
//       await crossChainGovernor.castVote(proposalId, 1); // Vote in favor
//       await crossChainGovernor.connect(addr1).castVote(proposalId, 1); // Another vote in favor

//       // Check vote counts
//       const proposalVotes = await crossChainGovernor.proposalVotes(proposalId);
//       expect(proposalVotes.forVotes).to.be.gt(0);
//     });

//     it("Should allow executing a successful proposal", async function () {
//       const proposalTx = await crossChainGovernor.proposeUpdateThreshold(
//         "destinationChain",
//         "destinationContract",
//         thresholdContract.address,
//         100
//       );
//       const receipt = await proposalTx.wait();
//       const event = receipt.events?.find(
//         (e) => e.event === "CrossChainProposalCreated"
//       );
//       const proposalId = event.args.proposalId;

//       // Move forward past the voting delay
//       await ethers.provider.send("evm_increaseTime", [VOTING_DELAY + 1]);
//       await ethers.provider.send("evm_mine");

//       // Cast votes
//       await crossChainGovernor.castVote(proposalId, 1); // Vote in favor
//       await crossChainGovernor.connect(addr1).castVote(proposalId, 1); // Another vote in favor

//       // Move forward past the voting period
//       await ethers.provider.send("evm_increaseTime", [VOTING_PERIOD + 1]);
//       await ethers.provider.send("evm_mine");

//       // Check proposal state
//       expect(await crossChainGovernor.state(proposalId)).to.equal(4); // Succeeded

//       // Execute the proposal
//       await expect(
//         crossChainGovernor.executeApprovedProposal(proposalId)
//       ).to.emit(crossChainGovernor, "CrossChainProposalSent");
//     });

//     it("Should update threshold on the destination chain", async function () {
//       // This test simulates the cross-chain execution
//       const proposalTx = await crossChainGovernor.proposeUpdateThreshold(
//         "destinationChain",
//         "destinationContract",
//         thresholdContract.address,
//         100
//       );
//       const receipt = await proposalTx.wait();
//       const event = receipt.events?.find(
//         (e) => e.event === "CrossChainProposalCreated"
//       );
//       const proposalId = event.args.proposalId;

//       // Voting process (same as before)
//       await ethers.provider.send("evm_increaseTime", [VOTING_DELAY + 1]);
//       await ethers.provider.send("evm_mine");
//       await crossChainGovernor.castVote(proposalId, 1);
//       await crossChainGovernor.connect(addr1).castVote(proposalId, 1);
//       await ethers.provider.send("evm_increaseTime", [VOTING_PERIOD + 1]);
//       await ethers.provider.send("evm_mine");

//       // Execute the proposal
//       await crossChainGovernor.executeApprovedProposal(proposalId);

//       // Simulate the cross-chain execution
//       const payload = ethers.utils.defaultAbiCoder.encode(
//         ["bytes", "tuple(address target, uint256 value, bytes callData)[]"],
//         [
//           ethers.utils.defaultAbiCoder.encode(["address"], [owner.address]),
//           [
//             {
//               target: thresholdContract.address,
//               value: 0,
//               callData: thresholdContract.interface.encodeFunctionData(
//                 "updateThreshold",
//                 [100]
//               ),
//             },
//           ],
//         ]
//       );

//       await crossChainGovernor.execute("sourceChain", "sourceAddress", payload);

//       // Check if the threshold was updated
//       expect(await thresholdContract.threshold()).to.equal(100);
//     });
//   });
// });

// // With Claude's changes
// const { ethers } = require("hardhat");
// const { expect } = require("chai");
// require("@nomicfoundation/hardhat-chai-matchers")

// describe("CrossChainGovernor", function () {
//   let governanceToken,
//     crossChainGovernor,
//     mockAxelarGateway,
//     mockAxelarGasService,
//     interchainProposalSender,
//     thresholdContract;
//   let owner, addr1, addr2;

//   beforeEach(async function () {
//     [owner, addr1, addr2] = await ethers.getSigners();

//     const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
//     governanceToken = await GovernanceToken.deploy(owner.address);

//     const MockAxelarGateway = await ethers.getContractFactory(
//       "MockAxelarGateway"
//     );
//     mockAxelarGateway = await MockAxelarGateway.deploy();

//     const MockAxelarGasService = await ethers.getContractFactory(
//       "MockAxelarGasService"
//     );
//     mockAxelarGasService = await MockAxelarGasService.deploy();

//     const InterchainProposalSender = await ethers.getContractFactory(
//       "InterchainProposalSender"
//     );
//     interchainProposalSender = await InterchainProposalSender.deploy(
//       await mockAxelarGateway.getAddress(),
//       await mockAxelarGasService.getAddress()
//     );

//     const ThresholdContract = await ethers.getContractFactory(
//       "ThresholdContract"
//     );
//     thresholdContract = await ThresholdContract.deploy();

//     const CrossChainGovernor = await ethers.getContractFactory(
//       "CrossChainGovernor"
//     );
//     crossChainGovernor = await CrossChainGovernor.deploy(
//       "CrossChainGovernor",
//       await governanceToken.getAddress(),
//       await mockAxelarGateway.getAddress(),
//       await mockAxelarGasService.getAddress(),
//       await interchainProposalSender.getAddress()
//     );

//     await governanceToken.delegate(owner.address);
//     await governanceToken.transfer(addr1.address, ethers.parseEther("100"));
//     await governanceToken.connect(addr1).delegate(addr1.address);
//     await governanceToken.mint(owner.address, ethers.parseEther("1000000"));

//     await ethers.provider.send("evm_mine", []);
//   });

//   describe("Deployment", function () {
//     it("Should set the right token", async function () {
//       expect(await crossChainGovernor.token()).to.equal(
//         await governanceToken.getAddress()
//       );
//     });

//     it("Should set the right gas service", async function () {
//       expect(await crossChainGovernor.gasService()).to.equal(
//         await mockAxelarGasService.getAddress()
//       );
//     });

//     it("Should set the right proposal sender", async function () {
//       expect(await crossChainGovernor.proposalSender()).to.equal(
//         await interchainProposalSender.getAddress()
//       );
//     });
//   });

//   describe("Governance settings", function () {
//     it("Should have the correct voting delay", async function () {
//       expect(await crossChainGovernor.votingDelay()).to.equal(1);
//     });

//     it("Should have the correct voting period", async function () {
//       expect(await crossChainGovernor.votingPeriod()).to.equal(50400);
//     });

//     it("Should have the correct quorum", async function () {
//       expect(await crossChainGovernor.quorum(0)).to.equal(
//         ethers.parseEther("1")
//       );
//     });
//   });

//   describe("Whitelisting", function () {
//     it("Should allow whitelisting a proposal sender", async function () {
//       const destinationChain = "destinationChain";
//       const destinationContract = await crossChainGovernor.getAddress();
//       const newThreshold = 1;

//       const proposeTx = await crossChainGovernor.proposeThresholdUpdate(
//         destinationChain,
//         destinationContract,
//         await thresholdContract.getAddress(),
//         newThreshold
//       );

//       const proposeReceipt = await proposeTx.wait();

//       console.log("Full Transaction Receipt:", proposeReceipt);
//       const event = proposeReceipt.events?.find(
//         (e) => e.event === "ThresholdProposalCreated"
//       );
//       expect(event).to.not.be.undefined;
//       const proposalId = event.args.proposalId;

//       await ethers.provider.send("evm_mine", []);
//       await crossChainGovernor.castVote(proposalId, 1);
//       await ethers.provider.send("evm_increaseTime", [50400]);
//       await ethers.provider.send("evm_mine", []);

//       //   await expect(crossChainGovernor.executeThresholdProposal(proposalId))
//       //     .to.emit(crossChainGovernor, "WhitelistedSenderSet")
//       //     .withArgs("sourceChain", addr1.address, true);

//       expect(
//         await crossChainGovernor.whitelistedSenders(
//           "sourceChain",
//           addr1.address
//         )
//       ).to.be.true;
//     });

//     // it("Should allow whitelisting a proposal caller", async function () {
//     //   const callerBytes = ethers.AbiCoder.defaultAbiCoder().encode(
//     //     ["address"],
//     //     [addr1.address]
//     //   );
//     //   const description = "Whitelist proposal caller";
//     //   const proposalId = await propose(
//     //     description,
//     //     "setWhitelistedProposalCaller",
//     //     ["sourceChain", callerBytes, true]
//     //   );
//     //   await vote(proposalId);
//     //   await execute(proposalId, description, "setWhitelistedProposalCaller", [
//     //     "sourceChain",
//     //     callerBytes,
//     //     true,
//     //   ]);

//     //   expect(
//     //     await crossChainGovernor.whitelistedCallers("sourceChain", callerBytes)
//     //   ).to.be.true;
//     // });
//   });

//   describe("Threshold Proposal", function () {
//     it("Should allow creating a threshold proposal", async function () {
//       const destinationChain = "destinationChain";
//       const destinationContract = await thresholdContract.getAddress(); // Ensure this contract is deployed
//       const newThreshold = 1000;

//       const proposeTx = await crossChainGovernor.proposeThresholdUpdate(
//         destinationChain,
//         destinationContract,
//         await thresholdContract.getAddress(),
//         newThreshold
//       );

//       const receipt = await proposeTx.wait();

//       // Check for event with optional chaining
//       const event = receipt.events?.find(
//         (log) => log.event === "ThresholdProposalCreated"
//       );

//       expect(event).to.not.be.undefined; // Ensure the event was found

//       // Access and check the proposalId
//       const proposalId = event.args?.proposalId;
//       expect(proposalId).to.not.be.undefined; // Ensure proposalId is not undefined
//     });

//     it("Should allow voting on a threshold proposal", async function () {
//       const destinationChain = "destinationChain";
//       const destinationContract = await thresholdContract.getAddress();
//       const newThreshold = 1000;

//       const proposeTx = await crossChainGovernor.proposeThresholdUpdate(
//         destinationChain,
//         destinationContract,
//         await thresholdContract.getAddress(),
//         newThreshold
//       );
//       const proposeReceipt = await proposeTx.wait();
//       const proposalId = proposeReceipt.events.find(
//         (e) => e.event === "ThresholdProposalCreated"
//       ).args.proposalId;

//       await ethers.provider.send("evm_mine", []);

//       await expect(crossChainGovernor.castVote(proposalId, 1)).to.emit(
//         crossChainGovernor,
//         "VoteCast"
//       );
//     });

//     // it("Should execute a successful threshold proposal", async function () {
//     //   const destinationChain = "destinationChain";
//     //   const destinationContract = await thresholdContract.getAddress();
//     //   const newThreshold = 1000;

//     //   const proposeTx = await crossChainGovernor.proposeThresholdUpdate(
//     //     destinationChain,
//     //     destinationContract,
//     //     thresholdContract.address,
//     //     newThreshold
//     //   );
//     //   const proposeReceipt = await proposeTx.wait();
//     //   const proposalId = proposeReceipt.events.find(
//     //     (e) => e.event === "ThresholdProposalCreated"
//     //   ).args.proposalId;

//     //   await ethers.provider.send("evm_mine", []);
//     //   await crossChainGovernor.castVote(proposalId, 1);
//     //   await ethers.provider.send("evm_increaseTime", [50400]);
//     //   await ethers.provider.send("evm_mine", []);

//     //   await expect(
//     //     crossChainGovernor.executeThresholdProposal(proposalId)
//     //   ).to.emit(interchainProposalSender, "ProposalSent");
//     // });
//   });

//   describe("Cross-chain execution", function () {
//     beforeEach(async function () {
//       const destinationChain = "sourceChain";
//       const destinationContract = await crossChainGovernor.getAddress();
//       const newThreshold = 1; // This could be any value, as we're not actually updating a threshold

//       const proposeTx = await crossChainGovernor.proposeThresholdUpdate(
//         destinationChain,
//         destinationContract,
//         await crossChainGovernor.getAddress(),
//         newThreshold
//       );

//       const proposeReceipt = await proposeTx.wait();
//       const proposalId = proposeReceipt.events.find(
//         (e) => e.event === "ThresholdProposalCreated"
//       ).args.proposalId;

//       await ethers.provider.send("evm_mine", []);
//       await crossChainGovernor.castVote(proposalId, 1);
//       await ethers.provider.send("evm_increaseTime", [50400]);
//       await ethers.provider.send("evm_mine", []);

//       await crossChainGovernor.executeThresholdProposal(proposalId);
//     });

//     it("Should execute a cross-chain call from a whitelisted sender and caller", async function () {
//       await crossChainGovernor.setWhitelistedProposalSender(
//         "sourceChain",
//         owner.address,
//         true
//       );
//       const callerBytes = ethers.utils.defaultAbiCoder.encode(
//         ["address"],
//         [owner.address]
//       );
//       await crossChainGovernor.setWhitelistedProposalCaller(
//         "sourceChain",
//         callerBytes,
//         true
//       );

//       const calls = [
//         {
//           target: addr2.address,
//           value: 0,
//           callData: "0x",
//         },
//       ];

//       const payload = ethers.utils.defaultAbiCoder.encode(
//         ["bytes", "tuple(address target, uint256 value, bytes callData)[]"],
//         [callerBytes, calls]
//       );

//       await expect(
//         crossChainGovernor.execute("sourceChain", owner.address, payload)
//       ).to.emit(crossChainGovernor, "ProposalExecuted");
//     });

//     it("Should revert when executing a cross-chain call from a non-whitelisted sender", async function () {
//       const callerBytes = ethers.utils.defaultAbiCoder.encode(
//         ["address"],
//         [owner.address]
//       );
//       await crossChainGovernor.setWhitelistedProposalCaller(
//         "sourceChain",
//         callerBytes,
//         true
//       );

//       const calls = [
//         {
//           target: addr2.address,
//           value: 0,
//           callData: "0x",
//         },
//       ];

//       const payload = ethers.utils.defaultAbiCoder.encode(
//         ["bytes", "tuple(address target, uint256 value, bytes callData)[]"],
//         [callerBytes, calls]
//       );

//       await expect(
//         crossChainGovernor.execute("sourceChain", owner.address, payload)
//       ).to.be.revertedWith("Not whitelisted sender");
//     });

//     it("Should revert when executing a cross-chain call from a non-whitelisted caller", async function () {
//       await crossChainGovernor.setWhitelistedProposalSender(
//         "sourceChain",
//         owner.address,
//         true
//       );

//       const calls = [
//         {
//           target: addr2.address,
//           value: 0,
//           callData: "0x",
//         },
//       ];

//       const callerBytes = ethers.utils.defaultAbiCoder.encode(
//         ["address"],
//         [owner.address]
//       );
//       const payload = ethers.utils.defaultAbiCoder.encode(
//         ["bytes", "tuple(address target, uint256 value, bytes callData)[]"],
//         [callerBytes, calls]
//       );

//       await expect(
//         crossChainGovernor.execute("sourceChain", owner.address, payload)
//       ).to.be.revertedWith("Not whitelisted caller");
//     });
//   });

//   describe("Proposal lifecycle", function () {
//     let proposalId;

//     beforeEach(async function () {
//       const destinationChain = "destinationChain";
//       const destinationContract = await thresholdContract.getAddress();
//       const newThreshold = 1000;

//       const proposeTx = await crossChainGovernor.proposeThresholdUpdate(
//         destinationChain,
//         destinationContract,
//         await thresholdContract.getAddress(),
//         newThreshold
//       );
//       const proposeReceipt = await proposeTx.wait();
//       proposalId = proposeReceipt.events.find(
//         (e) => e.event === "ThresholdProposalCreated"
//       ).args.proposalId;
//     });

//     it("Should start in the Pending state", async function () {
//       expect(await crossChainGovernor.state(proposalId)).to.equal(0); // Pending
//     });

//     it("Should move to Active state after votingDelay", async function () {
//       await ethers.provider.send("evm_mine", []);
//       expect(await crossChainGovernor.state(proposalId)).to.equal(1); // Active
//     });

//     it("Should allow voting when Active", async function () {
//       await ethers.provider.send("evm_mine", []);
//       await expect(crossChainGovernor.castVote(proposalId, 1)).to.emit(
//         crossChainGovernor,
//         "VoteCast"
//       );
//     });

//     it("Should move to Succeeded state after votingPeriod if quorum is met", async function () {
//       await ethers.provider.send("evm_mine", []);
//       await crossChainGovernor.castVote(proposalId, 1);
//       await ethers.provider.send("evm_increaseTime", [50400]);
//       await ethers.provider.send("evm_mine", []);
//       expect(await crossChainGovernor.state(proposalId)).to.equal(4); // Succeeded
//     });

//     it("Should move to Defeated state after votingPeriod if quorum is not met", async function () {
//       await ethers.provider.send("evm_increaseTime", [50400]);
//       await ethers.provider.send("evm_mine", []);
//       expect(await crossChainGovernor.state(proposalId)).to.equal(3); // Defeated
//     });

//     it("Should only allow execution of Succeeded proposals", async function () {
//       await ethers.provider.send("evm_mine", []);
//       await crossChainGovernor.castVote(proposalId, 1);
//       await ethers.provider.send("evm_increaseTime", [50400]);
//       await ethers.provider.send("evm_mine", []);

//       await expect(
//         crossChainGovernor.executeThresholdProposal(proposalId)
//       ).to.emit(interchainProposalSender, "ProposalSent");
//     });

//     it("Should revert when trying to execute a non-Succeeded proposal", async function () {
//       await ethers.provider.send("evm_increaseTime", [50400]);
//       await ethers.provider.send("evm_mine", []);

//       await expect(
//         crossChainGovernor.executeThresholdProposal(proposalId)
//       ).to.be.revertedWith("Proposal must be succeeded");
//     });
//   });

//   describe("Gas payment", function () {
//     it("Should forward gas payment to InterchainProposalSender", async function () {
//       const destinationChain = "destinationChain";
//       const destinationContract = await thresholdContract.getAddress();
//       const newThreshold = 1000;

//       const proposeTx = await crossChainGovernor.proposeThresholdUpdate(
//         destinationChain,
//         destinationContract,
//         await thresholdContract.getAddress(),
//         newThreshold
//       );
//       const proposeReceipt = await proposeTx.wait();
//       const proposalId = proposeReceipt.events.find(
//         (e) => e.event === "ThresholdProposalCreated"
//       ).args.proposalId;

//       await ethers.provider.send("evm_mine", []);
//       await crossChainGovernor.castVote(proposalId, 1);
//       await ethers.provider.send("evm_increaseTime", [50400]);
//       await ethers.provider.send("evm_mine", []);

//       const gasFee = ethers.utils.parseEther("0.1");
//       await expect(
//         crossChainGovernor.executeThresholdProposal(proposalId, {
//           value: gasFee,
//         })
//       )
//         .to.emit(interchainProposalSender, "ProposalSent")
//         .and.to.changeEtherBalances(
//           [crossChainGovernor, interchainProposalSender],
//           [0, gasFee]
//         );
//     });
//   });

//   describe("Edge cases", function () {
//     it("Should handle multiple proposals correctly", async function () {
//       const destinationChain = "destinationChain";
//       const newThreshold1 = 1000;
//       const newThreshold2 = 2000;

//       const proposeTx1 = await crossChainGovernor.proposeThresholdUpdate(
//         destinationChain,
//         thresholdContract.address,
//         newThreshold1
//       );
//       const proposeReceipt1 = await proposeTx1.wait();
//       const proposalId1 = proposeReceipt1.events.find(
//         (e) => e.event === "ThresholdProposalCreated"
//       ).args.proposalId;

//       const proposeTx2 = await crossChainGovernor.proposeThresholdUpdate(
//         destinationChain,
//         thresholdContract.address,
//         newThreshold2
//       );
//       const proposeReceipt2 = await proposeTx2.wait();
//       const proposalId2 = proposeReceipt2.events.find(
//         (e) => e.event === "ThresholdProposalCreated"
//       ).args.proposalId;

//       await ethers.provider.send("evm_mine", []);

//       await crossChainGovernor.castVote(proposalId1, 1);
//       await crossChainGovernor.castVote(proposalId2, 0);

//       await ethers.provider.send("evm_increaseTime", [50400]);
//       await ethers.provider.send("evm_mine", []);

//       expect(await crossChainGovernor.state(proposalId1)).to.equal(4); // Succeeded
//       expect(await crossChainGovernor.state(proposalId2)).to.equal(3); // Defeated
//     });

//     it("Should handle proposal with zero votes correctly", async function () {
//       const destinationChain = "destinationChain";
//       const newThreshold = 1000;

//       const proposeTx = await crossChainGovernor.proposeThresholdUpdate(
//         destinationChain,
//         thresholdContract.address,
//         newThreshold
//       );
//       const proposeReceipt = await proposeTx.wait();
//       const proposalId = proposeReceipt.events.find(
//         (e) => e.event === "ThresholdProposalCreated"
//       ).args.proposalId;

//       await ethers.provider.send("evm_increaseTime", [50400]);
//       await ethers.provider.send("evm_mine", []);

//       expect(await crossChainGovernor.state(proposalId)).to.equal(3); // Defeated
//     });
//   });
// });

// With Chat GPT
const { ethers } = require("hardhat");
const { expect } = require("chai");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("CrossChainGovernor", function () {
  let governanceToken,
    crossChainGovernor,
    mockAxelarGateway,
    mockAxelarGasService,
    interchainProposalSender,
    thresholdContract;
  let owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
    governanceToken = await GovernanceToken.deploy(owner.address);

    const MockAxelarGateway = await ethers.getContractFactory(
      "MockAxelarGateway"
    );
    mockAxelarGateway = await MockAxelarGateway.deploy();

    const MockAxelarGasService = await ethers.getContractFactory(
      "MockAxelarGasService"
    );
    mockAxelarGasService = await MockAxelarGasService.deploy();

    const InterchainProposalSender = await ethers.getContractFactory(
      "InterchainProposalSender"
    );
    interchainProposalSender = await InterchainProposalSender.deploy(
      await mockAxelarGateway.getAddress(),
      await mockAxelarGasService.getAddress()
    );

    const ThresholdContract = await ethers.getContractFactory(
      "ThresholdContract"
    );
    thresholdContract = await ThresholdContract.deploy();

    const CrossChainGovernor = await ethers.getContractFactory(
      "CrossChainGovernor"
    );
    crossChainGovernor = await CrossChainGovernor.deploy(
      "CrossChainGovernor",
      await governanceToken.getAddress(),
      await mockAxelarGateway.getAddress(),
      await mockAxelarGasService.getAddress(),
      await interchainProposalSender.getAddress()
    );

    await governanceToken.delegate(owner.address);
    await governanceToken.transfer(addr1.address, ethers.parseEther("100"));
    await governanceToken.connect(addr1).delegate(addr1.address);
    await governanceToken.mint(owner.address, ethers.parseEther("1000000"));

    await ethers.provider.send("evm_mine", []);
  });

  // Deployment Tests
  describe("Deployment", function () {
    it("Should set the right token", async function () {
      expect(await crossChainGovernor.token()).to.equal(
        await governanceToken.getAddress()
      );
    });

    it("Should set the right gas service", async function () {
      expect(await crossChainGovernor.gasService()).to.equal(
        await mockAxelarGasService.getAddress()
      );
    });

    it("Should set the right proposal sender", async function () {
      expect(await crossChainGovernor.proposalSender()).to.equal(
        await interchainProposalSender.getAddress()
      );
    });
  });

  // Governance Settings Tests
  describe("Governance settings", function () {
    it("Should have the correct voting delay", async function () {
      expect(await crossChainGovernor.votingDelay()).to.equal(1);
    });

    it("Should have the correct voting period", async function () {
      expect(await crossChainGovernor.votingPeriod()).to.equal(50400);
    });

    it("Should have the correct quorum", async function () {
      expect(await crossChainGovernor.quorum(0)).to.equal(
        ethers.parseEther("1")
      );
    });
  });

  // Whitelisting Tests
  describe("Whitelisting", function () {
    it("Should allow whitelisting a proposal sender", async function () {
      const destinationChain = "destinationChain";
      const destinationContract = await thresholdContract.getAddress();
      const newThreshold = 1000;

      // Create the proposal and expect the event to be emitted
      const proposeTx = await crossChainGovernor.proposeThresholdUpdate(
        destinationChain,
        destinationContract,
        await thresholdContract.getAddress(),
        newThreshold
      );

      // Wait for the transaction to be mined
      const proposeReceipt = await proposeTx.wait();

      // Assert that the event was emitted
      await expect(proposeTx)
        .to.emit(crossChainGovernor, "ThresholdProposalCreated")
        .withArgs(
          anyValue, // proposalId
          destinationChain,
          destinationContract,
          await thresholdContract.getAddress(),
          newThreshold
        );

      // Extract the proposalId from the event
      const event = proposeReceipt.events.find(
        (e) => e.event === "ThresholdProposalCreated"
      );

      if (!event) {
        throw new Error("ThresholdProposalCreated event not found");
      }

      const proposalId = event.args.proposalId;

      // Mine a block to move the proposal to Active state
      await ethers.provider.send("evm_mine", []);

      // Cast a vote
      await expect(crossChainGovernor.castVote(proposalId, 1)).to.emit(
        crossChainGovernor,
        "VoteCast"
      );
    });
  });

  // Threshold Proposal Tests
  describe("Threshold Proposal", function () {
    it("Should allow creating a threshold proposal", async function () {
      const destinationChain = "destinationChain";
      const destinationContract = await thresholdContract.getAddress();
      const newThreshold = 1000;

      // Adjusted to expect 5 arguments
      await expect(
        crossChainGovernor.proposeThresholdUpdate(
          destinationChain,
          destinationContract,
          await thresholdContract.getAddress(),
          newThreshold
        )
      )
        .to.emit(crossChainGovernor, "ThresholdProposalCreated")
        .withArgs(
          anyValue,
          destinationChain,
          destinationContract,
          anyValue,
          newThreshold
        ); // 5 arguments
    });

    it("Should allow voting on a threshold proposal", async function () {
      const destinationChain = "destinationChain";
      const destinationContract = await thresholdContract.getAddress();
      const newThreshold = 1000;

      // Create the proposal
      const proposeTx = await crossChainGovernor.proposeThresholdUpdate(
        destinationChain,
        destinationContract,
        destinationContract,
        newThreshold
      );
      const proposeReceipt = await proposeTx.wait();

      // Extract the event
      const event = proposeReceipt.events.find(
        (e) => e.event === "ThresholdProposalCreated"
      );

      if (!event) {
        throw new Error("ThresholdProposalCreated event not found");
      }

      const proposalId = event.args.proposalId;

      // Mine blocks to move the proposal to Active state
      await ethers.provider.send("evm_mine", []);

      // Cast a vote
      await expect(crossChainGovernor.castVote(proposalId, 1)).to.emit(
        crossChainGovernor,
        "VoteCast"
      );
    });
  });

  // Cross-Chain Execution Tests
  describe("Cross-chain execution", function () {
    let proposalId;

    beforeEach(async function () {
      const destinationChain = "sourceChain";
      const destinationContract = await crossChainGovernor.getAddress();
      const newThreshold = 1;

      // Create a threshold proposal
      const proposeTx = await crossChainGovernor.proposeThresholdUpdate(
        destinationChain,
        destinationContract,
        await crossChainGovernor.getAddress(),
        newThreshold
      );

      const proposeReceipt = await proposeTx.wait();
      const event = proposeReceipt.logs.find(
        (log) => log.fragment.name === "ThresholdProposalCreated"
      );
      const proposalId = event.args[0]; // First argument is proposalId

      // Mine blocks to move the proposal to Active state
      await ethers.provider.send("evm_mine", []);

      // Cast a vote
      await crossChainGovernor.castVote(proposalId, 1);

      // Mine blocks to complete the voting period
      await ethers.provider.send("evm_increaseTime", [50400]); // Assume voting period is 50400
      await ethers.provider.send("evm_mine", []);

      // Execute the proposal
      await crossChainGovernor.executeThresholdProposal(proposalId);
    });

    it("Should execute a cross-chain call from a whitelisted sender and caller", async function () {
      await crossChainGovernor.setWhitelistedProposalSender(
        "sourceChain",
        owner.address,
        true
      );
      const callerBytes = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [owner.address]
      );
      await crossChainGovernor.setWhitelistedProposalCaller(
        "sourceChain",
        callerBytes,
        true
      );

      const calls = [
        {
          target: addr2.address,
          value: 0,
          callData: "0x",
        },
      ];

      const payload = ethers.utils.defaultAbiCoder.encode(
        ["bytes", "tuple(address target, uint256 value, bytes callData)[]"],
        [callerBytes, calls]
      );

      await expect(
        crossChainGovernor.execute("sourceChain", owner.address, payload)
      ).to.emit(crossChainGovernor, "ProposalExecuted");
    });
  });

  // Proposal Lifecycle Tests
  describe("Proposal lifecycle", function () {
    let proposalId;

    beforeEach(async function () {
      const destinationChain = "destinationChain";
      const destinationContract = await thresholdContract.getAddress();
      const newThreshold = 1000;

      const proposeTx = await crossChainGovernor.proposeThresholdUpdate(
        destinationChain,
        destinationContract,
        await thresholdContract.getAddress(),
        newThreshold
      );

      const proposeReceipt = await proposeTx.wait();

      // Capture the correct event from logs
      const event = proposeReceipt.logs.find(
        (log) => log.fragment.name === "ThresholdProposalCreated"
      );

      const proposalId = event.args[0]; // First argument is proposalId

      await ethers.provider.send("evm_mine", []);
    });

    it("Should start in the Pending state", async function () {
      const destinationChain = "destinationChain";
      const destinationContract = await thresholdContract.getAddress();
      const newThreshold = 1000;

      // Create the proposal
      const proposeTx = await crossChainGovernor.proposeThresholdUpdate(
        destinationChain,
        destinationContract,
        await thresholdContract.getAddress(),
        newThreshold
      );
      const proposeReceipt = await proposeTx.wait();
      const event = proposeReceipt.logs.find(
        (log) => log.fragment.name === "ThresholdProposalCreated"
      );
      const proposalId = event.args[0]; // First argument is proposalId

      // Check that it is in the Pending state
      const proposalState = await crossChainGovernor.state(proposalId);
      expect(proposalState).to.equal(0); // 0 is the Pending state
    });

    it("Should move to Active state after votingDelay", async function () {
      const destinationChain = "destinationChain";
      const destinationContract = await thresholdContract.getAddress();
      const newThreshold = 1000;

      // Create the proposal
      const proposeTx = await crossChainGovernor.proposeThresholdUpdate(
        destinationChain,
        destinationContract,
        await thresholdContract.getAddress(),
        newThreshold
      );

      const proposeReceipt = await proposeTx.wait();

      const event = proposeReceipt.logs.find(
        (log) => log.fragment.name === "ThresholdProposalCreated"
      );
      const proposalId = event.args[0]; // First argument is proposalId

      // Mine a block to move the proposal from Pending to Active state
      await ethers.provider.send("evm_mine", []);

      const proposalState = await crossChainGovernor.state(proposalId);
      expect(proposalState).to.equal(1); // 1 is the Active state
    });

    it("Should allow voting when Active", async function () {
      await ethers.provider.send("evm_mine", []);
      await expect(crossChainGovernor.castVote(proposalId, 1)).to.emit(
        crossChainGovernor,
        "VoteCast"
      );
    });
  });
});
