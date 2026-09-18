// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Minimal ERC-20 surface so this treasury governs ANY token we mint
// (CrytoToken, CrytoverseToken, or any future token) with no imports.
interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function approve(address spender, uint256 value) external returns (bool);
}

/**
 *  MindTreasury — generic AI-governed treasury ("the Mind")
 *  ---------------------------------------------------------
 *  Works with any ERC-20. The Mind is the only address allowed to
 *  propose / execute / cancel. Every outflow is time-locked and its memo
 *  is recorded on-chain forever — transparency enforced by code, not promises.
 *
 *  ⚠️ TESTNET ONLY. Not audited, not an investment product.
 */
contract MindTreasury {
    IERC20 public immutable token;
    address public mind;
    uint256 public immutable delay;

    struct Proposal {
        address target;
        uint256 amount;
        string memo;
        uint256 eta;
        bool executed;
        bool cancelled;
    }

    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;

    event MindChanged(address indexed oldMind, address indexed newMind);
    event Deposit(address indexed from, uint256 amount);
    event ProposalCreated(uint256 indexed id, address indexed target, uint256 amount, string memo, uint256 eta);
    event ProposalExecuted(uint256 indexed id, address indexed target, uint256 amount);
    event ProposalCancelled(uint256 indexed id);

    modifier onlyMind() {
        require(msg.sender == mind, "only the Mind");
        _;
    }

    constructor(address _token, address _mind, uint256 _delay) {
        require(_token != address(0), "token is zero address");
        require(_mind != address(0), "mind is zero address");
        token = IERC20(_token);
        mind = _mind;
        delay = _delay;
    }

    // Anyone can deposit; funds are pulled from the caller via transferFrom.
    function deposit(uint256 amount) external {
        require(token.transferFrom(msg.sender, address(this), amount), "deposit failed");
        emit Deposit(msg.sender, amount);
    }

    function propose(address target, uint256 amount, string memory memo) external onlyMind {
        require(target != address(0), "target is zero address");
        require(amount > 0, "amount is zero");
        proposalCount++;
        uint256 id = proposalCount - 1;
        proposals[id] = Proposal(target, amount, memo, block.timestamp + delay, false, false);
        emit ProposalCreated(id, target, amount, memo, block.timestamp + delay);
    }

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

    function cancel(uint256 id) external onlyMind {
        Proposal storage p = proposals[id];
        require(!p.executed, "already executed");
        require(!p.cancelled, "already cancelled");
        p.cancelled = true;
        emit ProposalCancelled(id);
    }

    function changeMind(address newMind) external onlyMind {
        require(newMind != address(0), "new mind is zero address");
        emit MindChanged(mind, newMind);
        mind = newMind;
    }
}
