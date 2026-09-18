// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 *  CrytoToken — an educational / testnet ERC-20
 *  ---------------------------------------------------------------
 *  Built for fun as a "Cryto" token inspired by the Destroy All Humans
 *  Crypto character (Crypto-137). This is a STANDARD ERC-20 and is meant
 *  to be deployed on a TESTNET (Sepolia, etc.) only.
 *
 *  ⚠️ LEGAL NOTE:
 *  - "Destroy All Humans" and the "Crypto" character are THQ Nordic /
 *    Black Forest Games intellectual property.
 *  - Deploying this on a testnet for learning is fine.
 *  - Creating a REAL coin and SELLING it under that name would be
 *    trademark/copyright infringement. Rename it before any real launch.
 *
 *  No external imports — fully self-contained, deployable as-is.
 */
contract CrytoToken {
    // ---- Token metadata ----
    string public name = "Cryto";
    string public symbol = "CRYTO";
    uint8 public decimals = 18;

    uint256 public totalSupply;

    // ---- Balances & allowances ----
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    // ---- Events (EIP-20) ----
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     *  Constructor mints the initial supply to the deployer.
     *  Supply is in wei (18 decimals), so 1,000,000 CRYTO = 1e24.
     */
    constructor(uint256 _initialSupply) {
        totalSupply = _initialSupply;
        balanceOf[msg.sender] = _initialSupply;
        emit Transfer(address(0), msg.sender, _initialSupply);
    }

    // ---- ERC-20 core ----
    function transfer(address _to, uint256 _value) external returns (bool) {
        require(_to != address(0), "transfer to zero address");
        require(balanceOf[msg.sender] >= _value, "insufficient balance");

        balanceOf[msg.sender] -= _value;
        balanceOf[_to] += _value;
        emit Transfer(msg.sender, _to, _value);
        return true;
    }

    function approve(address _spender, uint256 _value) external returns (bool) {
        require(_spender != address(0), "approve to zero address");
        allowance[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
        return true;
    }

    function transferFrom(address _from, address _to, uint256 _value) external returns (bool) {
        require(_from != address(0), "from zero address");
        require(_to != address(0), "to zero address");
        require(balanceOf[_from] >= _value, "insufficient balance");
        require(allowance[_from][msg.sender] >= _value, "allowance exceeded");

        allowance[_from][msg.sender] -= _value;
        balanceOf[_from] -= _value;
        balanceOf[_to] += _value;
        emit Transfer(_from, _to, _value);
        return true;
    }

    // ---- Extras (optional, useful for a testnet playground) ----
    function mint(address _to, uint256 _value) external {
        require(_to != address(0), "mint to zero address");
        totalSupply += _value;
        balanceOf[_to] += _value;
        emit Transfer(address(0), _to, _value);
    }

    function burn(uint256 _value) external {
        require(balanceOf[msg.sender] >= _value, "insufficient balance");
        totalSupply -= _value;
        balanceOf[msg.sender] -= _value;
        emit Transfer(msg.sender, address(0), _value);
    }
}
