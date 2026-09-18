// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 *  CrytoverseToken — a parameterized, self-contained ERC-20 for the
 *  six-token "Crytoverse" ecosystem. Name/symbol/supply are set at deploy
 *  time so one contract powers all six characters.
 *
 *  ⚠️ Fan-work / IP notice: character names are unofficial fan-fiction
 *  expansions (see CHARACTERS.md). Testnet-only. Rename before any real
 *  launch — see CUSTODY.md.
 *
 *  No external imports — fully self-contained.
 */
contract CrytoverseToken {
    string public name;
    string public symbol;
    uint8 public immutable decimals = 18;
    string public role; // narrative role, e.g. "governance"

    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(string memory _name, string memory _symbol, string memory _role, uint256 _initialSupply) {
        name = _name;
        symbol = _symbol;
        role = _role;
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
