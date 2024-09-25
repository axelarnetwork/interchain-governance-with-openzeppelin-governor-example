# Interchain Governance with OpenZeppelin Governor Example

Link to article: https://blog.axelar.dev/cross-chain-governance-with-openzeppelin-governor-and-axelar

## Getting Started

Clone the repository and install the dependencies:

```sh
git clone https://github.com/axelarnetwork/interchain-governance-with-openzeppelin-governor-example.git

cd interchain-governance-with-openzeppelin-governor-example

npm install
```

## Running the Example

To test the example, you can run the following command:

```sh
npx hardhat test
```
You should see something similar to the following output:

```sh
CrossChainGovernor
    Deployment
      ✔ Should set the right token
      ✔ Should set the right gas service
      ✔ Should set the right proposal sender
    Governance settings
      ✔ Should have the correct voting delay
      ✔ Should have the correct voting period
      ✔ Should have the correct quorum
    Whitelisting
      ✔ Should allow whitelisting a proposal sender
    Threshold Proposal
      ✔ Should allow creating a threshold proposal
      ✔ Should allow voting on a threshold proposal (9103ms)
    Proposal lifecycle
      ✔ Should start in the Pending state
      ✔ Should move to Active state after votingDelay
      ✔ Should allow voting when Active
    Proposal Creation and Voting
      ✔ Should allow non-token holders to create proposals, but the proposal should fail (9040ms)
      ✔ Should not allow voting before the voting delay has passed
      ✔ Should not allow voting after the voting period has ended (9368ms)
      ✔ Should not allow double voting
    Proposal Execution
      ✔ Should not allow execution of a proposal that hasn't succeeded
      ✔ Should allow execution of a succeeded proposal (9349ms)
      ✔ Should not allow execution of an already executed proposal (9709ms)
  19 passing (50s)
```

