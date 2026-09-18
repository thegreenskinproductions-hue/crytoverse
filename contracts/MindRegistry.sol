// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 *  MindRegistry — on-chain index of every token the Mind governs.
 *  ---------------------------------------------------------------
 *  Lets us "run it for any extra tokens we make": deploy a MindTreasury for
 *  a new token, register it here, and the off-chain Mind + dashboard
 *  automatically discover and govern it. No code changes per token.
 */
contract MindRegistry {
    address public mind;
    address[] public tokens;
    mapping(address => address) public treasuryOf; // token -> treasury
    mapping(address => bool) public isToken;

    event Registered(address indexed token, address indexed treasury);
    event MindChanged(address indexed oldMind, address indexed newMind);

    modifier onlyMind() {
        require(msg.sender == mind, "only the Mind");
        _;
    }

    constructor(address _mind) {
        require(_mind != address(0), "mind is zero address");
        mind = _mind;
    }

    function register(address token, address treasury) external onlyMind {
        require(token != address(0), "token is zero address");
        require(treasury != address(0), "treasury is zero address");
        require(!isToken[token], "already registered");
        isToken[token] = true;
        treasuryOf[token] = treasury;
        tokens.push(token);
        emit Registered(token, treasury);
    }

    function tokenCount() external view returns (uint256) {
        return tokens.length;
    }

    function changeMind(address newMind) external onlyMind {
        require(newMind != address(0), "new mind is zero address");
        emit MindChanged(mind, newMind);
        mind = newMind;
    }
}
