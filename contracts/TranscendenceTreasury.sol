// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./CrytoToken.sol";

/**
 *  TranscendenceTreasury — AI-governed treasury ("the Mind")
 *  ---------------------------------------------------------------
 *  Inspired by the movie Transcendence (Johnny Depp as Dr. Will Caster):
 *  an uploaded intelligence that controls capital autonomously.
 *
 *  Here the "Mind" is a designated keeper address (your off-chain AI agent).
 *  The Mind cannot move funds instantly or secretly — every outflow must go
 *  through a transparent, time-locked proposal that is recorded on-chain.
 *
 *  This gives the "public clarity & transparency / no rug pull" property you
 *  asked DeepSeek about: all treasury actions are visible and delayed.
 *
 *  ⚠️ TESTNET ONLY. Not an investment product, not audited.
 */
contract TranscendenceTreasury {
    // The CRYTO token this treasury holds and disburses.
    CrytoToken public immutable token;

    // The AI keeper ("the Mind") — the only address allowed to propose/execute.
    address public mind;

    // Minimum time-lock delay before a proposal can be executed.
    uint256 public immutable delay;

    struct Proposal {
        address target;   // recipient of the disbursement
        uint256 amount;   // CRYTO amount (18-decimals wei)
        string memo;      // human-readable intent, kept on-chain for transparency
        uint256 eta;      // earliest execution timestamp (block.timestamp + delay)
        bool executed;
        bool cancelled;
    }

    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;

    event MindChanged(address indexed oldMind, address indexed newMind);
    event Deposit(address indexed from, uint256 amount);
    event ProposalCreated(
        uint256 indexed id,
        address indexed target,
        uint256 amount,
        string memo,
        uint256 eta
    );
    event ProposalExecuted(uint256 indexed id, address indexed target, uint256 amount);
    event ProposalCancelled(uint256 indexed id);

    constructor(address _token, address _mind, uint256 _delay) {
        token = CrytoToken(_token);
        mind = _mind;
        delay = _delay;
    }

    modifier onlyMind() {
        require(msg.sender == mind, "only the Mind");
        _;
    }

    // Accept ETH donations (kept simple; treasury primarily holds CRYTO).
    receive() external payable {}

    // Anyone can fund the treasury by approving CRYTO to this contract first.
    function deposit(uint256 amount) external {
        require(
            token.transferFrom(msg.sender, address(this), amount),
            "deposit transfer failed"
        );
        emit Deposit(msg.sender, amount);
    }

    // The Mind proposes a disbursement. It cannot be executed until the delay passes.
    function propose(
        address target,
        uint256 amount,
        string calldata memo
    ) external onlyMind returns (uint256 id) {
        require(target != address(0), "target is zero address");
        require(amount > 0, "amount must be positive");

        id = proposalCount++;
        proposals[id] = Proposal({
            target: target,
            amount: amount,
            memo: memo,
            eta: block.timestamp + delay,
            executed: false,
            cancelled: false
        });

        emit ProposalCreated(id, target, amount, memo, proposals[id].eta);
    }

    // The Mind executes a matured proposal.
    function execute(uint256 id) external onlyMind {
        Proposal storage p = proposals[id];
        require(!p.executed, "already executed");
        require(!p.cancelled, "already cancelled");
        require(block.timestamp >= p.eta, "time-lock still active");
        require(token.balanceOf(address(this)) >= p.amount, "insufficient treasury");

        p.executed = true;
        require(token.transfer(p.target, p.amount), "disbursement failed");
        emit ProposalExecuted(id, p.target, p.amount);
    }

    // The Mind can cancel a pending proposal before execution.
    function cancel(uint256 id) external onlyMind {
        Proposal storage p = proposals[id];
        require(!p.executed, "already executed");
        require(!p.cancelled, "already cancelled");

        p.cancelled = true;
        emit ProposalCancelled(id);
    }

    // Transfer the Mind role to a new keeper address.
    function changeMind(address newMind) external onlyMind {
        require(newMind != address(0), "new mind is zero address");
        emit MindChanged(mind, newMind);
        mind = newMind;
    }
}
