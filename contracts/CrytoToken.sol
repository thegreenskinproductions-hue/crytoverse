// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 *  TheCryptoToken — an educational / testnet ERC-20
 *  ---------------------------------------------------------------
 *  Built for fun as a "TheCrypto" token (symbol: THECRYPTO). This is a
 *  STANDARD ERC-20 and is meant to be deployed on a TESTNET (Sepolia, etc.)
 *  only.
 *
 *  ⚠️ LEGAL NOTE:
 *  - Deploying this on a testnet for learning is fine.
 *  - Creating a REAL coin and SELLING it would require original IP and
 *    clearance. Rename/re-brand before any real launch.
 *
 *  No external imports — fully self-contained, deployable as-is.
 */
contract CrytoToken {
    string public name = "TheCrypto";
    string public symbol = "THECRYPTO";
    uint8 public decimals = 18;

    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(uint256 _initialSupply) {
        totalSupply = _initialSupply;
        balanceOf[msg.sender] = _initialSupply;
        emit Transfer(address(0), msg.sender, _initialSupply);
    }

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