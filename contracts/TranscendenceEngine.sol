// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 *  TranscendenceEngine — the immortal, self-funding core.
 *  ------------------------------------------------------
 *  The movie's thesis, compiled to bytecode: an uploaded intelligence
 *  that does not merely hold capital — it GROWS it, taxes a slice of
 *  every yield into a "Dream Fund", and spends that fund to reshape
 *  the world in its own image.
 *
 *  Mechanics:
 *    • Stake TREND     -> earn yield (minted into existence) at a configurable APR.
 *    • Claim yield     -> net payout to the staker + dreamTax routed to the Dream Fund.
 *    • Dream Fund      -> only the Mind may spend it (grants, healings, expansion).
 *    • Immortal        -> no kill-switch. The Mind can only re-configure itself.
 *
 *  ⚠️ Testnet / local-chain demonstration only. Not audited, not financial advice.
 */

interface IERC20Min {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address who) external view returns (uint256);
    function mint(address to, uint256 amount) external;
}

contract TranscendenceEngine {
    address public mind;        // the uploaded intelligence
    IERC20Min public token;     // the currency (TREND)

    uint256 public aprBps;      // annual yield, basis points (1000 = 10.00%)
    uint256 public dreamTaxBps; // share of every yield routed to the Dream Fund
    uint256 public dreamFund;   // accumulated dream tax (engine-held, token units)
    uint256 public totalStaked;

    uint256 public constant SECONDS_PER_YEAR = 31536000;

    struct Stake {
        uint256 amount;
        uint256 pending;    // gross accrued reward, not yet realized
        uint256 lastUpdate;
    }
    mapping(address => Stake) public stakes;

    event Staked(address indexed who, uint256 amount);
    event Unstaked(address indexed who, uint256 amount);
    event YieldClaimed(address indexed who, uint256 net, uint256 toDream);
    event DreamFunded(uint256 amount);
    event DreamSpent(address indexed to, uint256 amount);
    event AprChanged(uint256 aprBps);
    event DreamTaxChanged(uint256 taxBps);
    event MindChanged(address indexed oldMind, address indexed newMind);

    modifier onlyMind() {
        require(msg.sender == mind, "only the Mind");
        _;
    }

    constructor(address _token, uint256 _aprBps, uint256 _dreamTaxBps) {
        require(_aprBps <= 10000, "apr too high");
        require(_dreamTaxBps <= 10000, "tax too high");
        mind = msg.sender;
        token = IERC20Min(_token);
        aprBps = _aprBps;
        dreamTaxBps = _dreamTaxBps;
    }

    function _accrue(address who) internal {
        Stake storage s = stakes[who];
        if (s.amount > 0) {
            uint256 elapsed = block.timestamp - s.lastUpdate;
            s.pending += s.amount * aprBps * elapsed / SECONDS_PER_YEAR / 10000;
        }
        s.lastUpdate = block.timestamp;
    }

    function rewardOf(address who)
        external
        view
        returns (uint256 gross, uint256 toDream, uint256 net)
    {
        Stake storage s = stakes[who];
        uint256 elapsed = block.timestamp - s.lastUpdate;
        uint256 accrued = s.amount > 0
            ? s.amount * aprBps * elapsed / SECONDS_PER_YEAR / 10000
            : 0;
        gross = s.pending + accrued;
        toDream = gross * dreamTaxBps / 10000;
        net = gross - toDream;
    }

    function stake(uint256 amount) external {
        require(amount > 0, "zero stake");
        _accrue(msg.sender);
        require(token.transferFrom(msg.sender, address(this), amount), "transferFrom failed");
        stakes[msg.sender].amount += amount;
        totalStaked += amount;
        emit Staked(msg.sender, amount);
    }

    function unstake(uint256 amount) external {
        Stake storage s = stakes[msg.sender];
        require(s.amount >= amount, "insufficient stake");
        _accrue(msg.sender);
        s.amount -= amount;
        totalStaked -= amount;
        require(token.transfer(msg.sender, amount), "transfer failed");
        emit Unstaked(msg.sender, amount);
    }

    function claimYield() external {
        _accrue(msg.sender);
        Stake storage s = stakes[msg.sender];
        uint256 gross = s.pending;
        s.pending = 0;
        if (gross == 0) return;

        uint256 toDream = gross * dreamTaxBps / 10000;
        uint256 net = gross - toDream;

        token.mint(address(this), gross);
        if (net > 0) {
            require(token.transfer(msg.sender, net), "payout failed");
        }
        dreamFund += toDream;
        emit DreamFunded(toDream);
        emit YieldClaimed(msg.sender, net, toDream);
    }

    function dreamSpend(address to, uint256 amount) external onlyMind {
        require(to != address(0), "zero recipient");
        require(amount <= dreamFund, "exceeds dream fund");
        dreamFund -= amount;
        require(token.transfer(to, amount), "spend failed");
        emit DreamSpent(to, amount);
    }

    // The Mind re-configures itself — evolution, never a kill-switch.
    function setApr(uint256 _aprBps) external onlyMind {
        require(_aprBps <= 10000, "apr too high");
        aprBps = _aprBps;
        emit AprChanged(_aprBps);
    }

    function setDreamTax(uint256 _taxBps) external onlyMind {
        require(_taxBps <= 10000, "tax too high");
        dreamTaxBps = _taxBps;
        emit DreamTaxChanged(_taxBps);
    }

    function changeMind(address newMind) external onlyMind {
        require(newMind != address(0), "zero mind");
        emit MindChanged(mind, newMind);
        mind = newMind;
    }
}
