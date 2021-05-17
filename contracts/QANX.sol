
////////////////////////////////////////////////////
// QANX STARTS HERE, PURE OPENZEPPELIN CODE ABOVE //
////////////////////////////////////////////////////

contract QANX is ERC20, Ownable {

    // INITIALIZE AN ERC20 TOKEN BASED ON THE OPENZEPPELIN VERSION
    constructor() ERC20("QANX Token", "QANX") {

        // INITIALLY MINT TOTAL SUPPLY TO CREATOR
        _mint(_msgSender(), 333333000 * (10 ** 18));
    }
}
