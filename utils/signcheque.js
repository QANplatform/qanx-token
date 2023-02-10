module.exports = function signCheque(signingKey, chainId, contrAddr, beneficiary, amount, hLock, sLock, hops) {
    let signer;
    try{
        signer = new ethers.utils.SigningKey(signingKey);
    }catch(e){
        console.warn(`"${signingKey}" is not a valid signing key!`);
        process.exit(1);
    }
    const cheque = {
        beneficiary,
        amount,
        hardLockUntil: hLock ? hLock : 0,
        softLockUntil: sLock ? sLock : 0,
        allowedHops: hops ? hops : 0
    };
    const sig = signer.signDigest(
        ethers.utils.keccak256(
            ethers.utils.defaultAbiCoder.encode(
                ['uint256', 'address', 'address', 'uint256', 'uint64', 'uint64', 'uint64'],
                [chainId, contrAddr, beneficiary, amount, cheque.hardLockUntil, cheque.softLockUntil, cheque.allowedHops]
            )
        )
    );
    cheque.signature = [sig.r, sig.yParityAndS];
    return cheque;
}
