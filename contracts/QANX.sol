
////////////////////////////////////////////////////
// QANX STARTS HERE, PURE OPENZEPPELIN CODE ABOVE //
////////////////////////////////////////////////////

contract QANX is ERC20, Ownable {

    // INITIALIZE AN ERC20 TOKEN BASED ON THE OPENZEPPELIN VERSION
    constructor() ERC20("QANX Token", "QANX") {

        // INITIALLY MINT TOTAL SUPPLY TO CREATOR
        _mint(_msgSender(), 333333000 * (10 ** 18));
    }

    // REPRESENTS A LOCK WHICH MIGHT BE APPLIED ON AN ADDRESS
    struct Lock {
        uint256 tokenAmount;    // HOW MANY TOKENS ARE LOCKED
        uint32 hardLockUntil;   // UNTIL WHEN NO LOCKED TOKENS CAN BE ACCESSED
        uint32 softLockUntil;   // UNTIL WHEN LOCKED TOKENS CAN BE GRADUALLY RELEASED
        uint8 allowedHops;      // HOW MANY TRANSFERS LEFT WITH SAME LOCK PARAMS
        uint32 lastUnlock;      // LAST GRADUAL UNLOCK TIME (SOFTLOCK PERIOD)
    }

    // THIS MAPS LOCK PARAMS TO CERTAIN ADDRESSES WHICH RECEIVED LOCKED TOKENS
    mapping (address => Lock) private _locks;

    // RETURNS LOCK INFORMATION OF A GIVEN ADDRESS
    function lockOf(address account) public view virtual returns (Lock memory) {
        return _locks[account];
    }

    // TRANSFER FUNCTION WITH LOCK PARAMETERS
    function transferLocked(address recipient, uint256 amount, uint32 hardLockUntil, uint32 softLockUntil, uint8 allowedHops) public {

        // ONLY ONE LOCKED TRANSACTION ALLOWED
        require(_locks[recipient].tokenAmount == 0, "Only one lock per address allowed!");
        
        // REGISTER LOCK
        _locks[recipient] = Lock(amount, hardLockUntil, softLockUntil, allowedHops, 0);

        // MAKE ACTUAL TRANSFER
        _transfer(_msgSender(), recipient, amount);
    }
}
