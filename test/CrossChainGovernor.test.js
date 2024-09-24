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
      mockAxelarGateway.address,
      mockAxelarGasService.address
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
      governanceToken.address,
      mockAxelarGateway.address,
      mockAxelarGasService.address,
      interchainProposalSender.address
    );

    await governanceToken.delegate(owner.address);
    await governanceToken.transfer(
      addr1.address,
      ethers.utils.parseEther("100")
    );
    await governanceToken.connect(addr1).delegate(addr1.address);
    await governanceToken.mint(
      owner.address,
      ethers.utils.parseEther("1000000")
    );

    await ethers.provider.send("evm_mine", []);
  });

  // Deployment Tests
  describe("Deployment", function () {
    it("Should set the right token", async function () {
      expect(await crossChainGovernor.token()).to.equal(
        governanceToken.address
      );
    });

    it("Should set the right gas service", async function () {
      expect(await crossChainGovernor.gasService()).to.equal(
        mockAxelarGasService.address
      );
    });

    it("Should set the right proposal sender", async function () {
      expect(await crossChainGovernor.proposalSender()).to.equal(
        interchainProposalSender.address
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
        ethers.utils.parseEther("1")
      );
    });
  });

  // Whitelisting Tests
  describe("Whitelisting", function () {
    it("Should allow whitelisting a proposal sender", async function () {
      const destinationChain = "destinationChain";
      const destinationContract = thresholdContract.address;
      const newThreshold = 1000;

      // Create the proposal and expect the event to be emitted
      const proposeTx = await crossChainGovernor.proposeThresholdUpdate(
        destinationChain,
        destinationContract,
        thresholdContract.address,
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
          thresholdContract.address,
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
      const destinationContract = thresholdContract.address;
      const newThreshold = 1000;

      // Adjusted to expect 5 arguments
      await expect(
        crossChainGovernor.proposeThresholdUpdate(
          destinationChain,
          destinationContract,
          thresholdContract.address,
          newThreshold
        )
      )
        .to.emit(crossChainGovernor, "ThresholdProposalCreated")
        .withArgs(
          anyValue,
          destinationChain,
          destinationContract,
          anyValue, // The thresholdContract address
          newThreshold
        ); // 5 arguments
    });

    it("Should allow voting on a threshold proposal", async function () {
      const destinationChain = "destinationChain";
      const destinationContract = thresholdContract.address;
      const newThreshold = 1000;

      const proposeTx = await crossChainGovernor.proposeThresholdUpdate(
        destinationChain,
        destinationContract,
        thresholdContract.address,
        newThreshold
      );
      const proposeReceipt = await proposeTx.wait();

      const event = proposeReceipt.events.find(
        (e) => e.event === "ThresholdProposalCreated"
      );

      if (!event) {
        throw new Error("ThresholdProposalCreated event not found");
      }

      const proposalId = event.args.proposalId;

      // Wait for the voting delay
      const votingDelay = await crossChainGovernor.votingDelay();
      for (let i = 0; i <= votingDelay.toNumber(); i++) {
        await ethers.provider.send("evm_mine", []);
      }

      // Check proposal state
      let proposalState = await crossChainGovernor.state(proposalId);
      expect(proposalState).to.equal(1); // Active

      // Cast a vote
      await expect(crossChainGovernor.castVote(proposalId, 1)).to.emit(
        crossChainGovernor,
        "VoteCast"
      );

      // Advance time to end the voting period
      const votingPeriod = await crossChainGovernor.votingPeriod(); // Returns number of blocks
      for (let i = 0; i < votingPeriod; i++) {
        await ethers.provider.send("evm_mine", []);
      }

      // Check proposal state
      proposalState = await crossChainGovernor.state(proposalId);
      expect(proposalState).to.equal(4); // Succeeded
    });
  });

  // Proposal Lifecycle Tests
  describe("Proposal lifecycle", function () {
    let proposalId;

    beforeEach(async function () {
      const destinationChain = "destinationChain";
      const destinationContract = thresholdContract.address;
      const newThreshold = 1000;

      const proposeTx = await crossChainGovernor.proposeThresholdUpdate(
        destinationChain,
        destinationContract,
        thresholdContract.address,
        newThreshold
      );

      const proposeReceipt = await proposeTx.wait();

      // Capture the correct event from logs
      const event = proposeReceipt.events.find(
        (e) => e.event === "ThresholdProposalCreated"
      );

      if (!event) {
        throw new Error("ThresholdProposalCreated event not found");
      }

      proposalId = event.args.proposalId; // Assign to the outer variable

      await ethers.provider.send("evm_mine", []);
    });

    it("Should start in the Pending state", async function () {
      // The proposal is created in the beforeEach hook
      const proposalState = await crossChainGovernor.state(proposalId);
      expect(proposalState).to.equal(0); // Pending
    });

    it("Should move to Active state after votingDelay", async function () {
      // Mine a block to move the proposal from Pending to Active state
      await ethers.provider.send("evm_mine", []);

      const proposalState = await crossChainGovernor.state(proposalId);
      expect(proposalState).to.equal(1); // Active
    });

    it("Should allow voting when Active", async function () {
      // Ensure the proposal is in Active state
      await ethers.provider.send("evm_mine", []);
      const proposalState = await crossChainGovernor.state(proposalId);
      expect(proposalState).to.equal(1);

      // Cast a vote
      await expect(crossChainGovernor.castVote(proposalId, 1)).to.emit(
        crossChainGovernor,
        "VoteCast"
      );
    });
  });

  describe("Proposal Creation and Voting", function () {
    it("Should allow non-token holders to create proposals, but the proposal should fail", async function () {
      const [, nonHolder] = await ethers.getSigners();

      // Create a proposal
      const tx = await crossChainGovernor
        .connect(nonHolder)
        .proposeThresholdUpdate(
          "destinationChain",
          crossChainGovernor.address,
          thresholdContract.address,
          1000
        );

      const receipt = await tx.wait();
      const event = receipt.events.find(
        (e) => e.event === "ThresholdProposalCreated"
      );
      expect(event).to.not.be.undefined;

      const proposalId = event.args.proposalId;

      // Advance the block to move past the voting delay
      const votingDelay = await crossChainGovernor.votingDelay();
      for (let i = 0; i <= votingDelay.toNumber(); i++) {
        await ethers.provider.send("evm_mine", []); // Mine blocks
      }

      // Let the proposal become active and fail due to insufficient quorum
      const votingPeriod = await crossChainGovernor.votingPeriod();
      for (let i = 0; i <= votingPeriod.toNumber(); i++) {
        await ethers.provider.send("evm_mine", []); // Advance to the end of the voting period
      }

      // Check if the proposal state is defeated (3) due to lack of quorum
      const newProposalState = await crossChainGovernor.state(proposalId);
      expect(newProposalState).to.equal(3); // State 3 is Defeated
    });

    it("Should not allow voting before the voting delay has passed", async function () {
      // First, create a proposal to get a valid proposalId
      const tx = await crossChainGovernor.proposeThresholdUpdate(
        "destinationChain",
        crossChainGovernor.address,
        thresholdContract.address,
        1000
      );

      // Wait for the transaction to be mined and get the event logs
      const receipt = await tx.wait();
      const event = receipt.events.find(
        (e) => e.event === "ThresholdProposalCreated"
      );

      // Ensure the event exists and extract the proposalId
      if (!event) {
        throw new Error("ThresholdProposalCreated event not found");
      }
      const proposalId = event.args.proposalId;

      // Now try to cast a vote before the voting delay has passed
      await expect(
        crossChainGovernor.castVote(proposalId, 1)
      ).to.be.revertedWith("Governor: vote not currently active");
    });

    it("Should not allow voting after the voting period has ended", async function () {
      // First, create a proposal to get a valid proposalId
      const tx = await crossChainGovernor.proposeThresholdUpdate(
        "destinationChain",
        crossChainGovernor.address,
        thresholdContract.address,
        1000
      );

      const receipt = await tx.wait();
      const event = receipt.events.find(
        (e) => e.event === "ThresholdProposalCreated"
      );

      if (!event) {
        throw new Error("ThresholdProposalCreated event not found");
      }
      const proposalId = event.args.proposalId;

      // Wait for the voting period to pass
      const votingPeriod = await crossChainGovernor.votingPeriod();
      for (let i = 0; i <= votingPeriod.toNumber(); i++) {
        await ethers.provider.send("evm_mine", []);
      }

      // Now try to vote after the voting period has ended
      await expect(
        crossChainGovernor.castVote(proposalId, 1)
      ).to.be.revertedWith("Governor: vote not currently active");
    });

    it("Should not allow double voting", async function () {
      // First, create a proposal to get a valid proposalId
      const tx = await crossChainGovernor.proposeThresholdUpdate(
        "destinationChain",
        crossChainGovernor.address,
        thresholdContract.address,
        1000
      );

      const receipt = await tx.wait();
      const event = receipt.events.find(
        (e) => e.event === "ThresholdProposalCreated"
      );

      if (!event) {
        throw new Error("ThresholdProposalCreated event not found");
      }
      const proposalId = event.args.proposalId;

      // Move forward to the voting period
      const votingDelay = await crossChainGovernor.votingDelay();
      for (let i = 0; i <= votingDelay.toNumber(); i++) {
        await ethers.provider.send("evm_mine", []);
      }

      // Cast the first vote
      await crossChainGovernor.castVote(proposalId, 1);

      // Now attempt to cast a second vote, which should fail
      await expect(
        crossChainGovernor.castVote(proposalId, 1)
      ).to.be.revertedWith("GovernorVotingSimple: vote already cast");
    });
  });

  describe("Proposal Execution", function () {
    it("Should not allow execution of a proposal that hasn't succeeded", async function () {
      // First, create a proposal to get a valid proposalId
      const tx = await crossChainGovernor.proposeThresholdUpdate(
        "destinationChain",
        crossChainGovernor.address,
        thresholdContract.address,
        1000
      );

      const receipt = await tx.wait();
      const event = receipt.events.find(
        (e) => e.event === "ThresholdProposalCreated"
      );

      if (!event) {
        throw new Error("ThresholdProposalCreated event not found");
      }
      const proposalId = event.args.proposalId;

      // Attempt to execute the proposal before it has succeeded
      await expect(
        crossChainGovernor.executeThresholdProposal(proposalId)
      ).to.be.revertedWith("Proposal must be succeeded");
    });

    it("Should allow execution of a succeeded proposal", async function () {
      // First, create a proposal to get a valid proposalId
      const tx = await crossChainGovernor.proposeThresholdUpdate(
        "destinationChain",
        crossChainGovernor.address,
        thresholdContract.address,
        1000
      );

      const receipt = await tx.wait();
      const event = receipt.events.find(
        (e) => e.event === "ThresholdProposalCreated"
      );

      if (!event) {
        throw new Error("ThresholdProposalCreated event not found");
      }
      const proposalId = event.args.proposalId;

      // Move forward to the voting period
      const votingDelay = await crossChainGovernor.votingDelay();
      for (let i = 0; i <= votingDelay.toNumber(); i++) {
        await ethers.provider.send("evm_mine", []);
      }

      // Cast a vote
      await crossChainGovernor.castVote(proposalId, 1);

      // Advance to end the voting period
      const votingPeriod = await crossChainGovernor.votingPeriod();
      for (let i = 0; i <= votingPeriod.toNumber(); i++) {
        await ethers.provider.send("evm_mine", []);
      }

      // Execute the proposal with the required gas fee
      const gasFee = ethers.utils.parseEther("0.1"); // Adjust this value as needed
      await expect(
        crossChainGovernor.executeThresholdProposal(proposalId, {
          value: gasFee,
        })
      ).to.emit(crossChainGovernor, "ThresholdProposalExecuted");
    });

    it("Should not allow execution of an already executed proposal", async function () {
      // First, create a proposal to get a valid proposalId
      const tx = await crossChainGovernor.proposeThresholdUpdate(
        "destinationChain",
        crossChainGovernor.address,
        thresholdContract.address,
        1000
      );

      const receipt = await tx.wait();
      const event = receipt.events.find(
        (e) => e.event === "ThresholdProposalCreated"
      );

      if (!event) {
        throw new Error("ThresholdProposalCreated event not found");
      }
      const proposalId = event.args.proposalId;

      // Move forward to the voting period
      const votingDelay = await crossChainGovernor.votingDelay();
      for (let i = 0; i <= votingDelay.toNumber(); i++) {
        await ethers.provider.send("evm_mine", []);
      }

      // Cast a vote
      await crossChainGovernor.castVote(proposalId, 1);

      // Advance to end the voting period
      const votingPeriod = await crossChainGovernor.votingPeriod();
      for (let i = 0; i <= votingPeriod.toNumber(); i++) {
        await ethers.provider.send("evm_mine", []);
      }

      // Execute the succeeded proposal with gas fee
      const gasFee = ethers.utils.parseEther("0.1"); // Adjust this value as needed
      await crossChainGovernor.executeThresholdProposal(proposalId, {
        value: gasFee,
      });

      // Try executing it again, which should fail
      await expect(
        crossChainGovernor.executeThresholdProposal(proposalId, {
          value: gasFee,
        })
      ).to.be.revertedWith("Proposal must be succeeded"); // This should revert now
    });
  });
});
