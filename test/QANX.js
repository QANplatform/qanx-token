const QANX = artifacts.require('QANX');
const utils = require('./utils');

contract("QANX", async accounts =>{

    // EASY ACCOUNT ACCESS
    const acc = utils.acc(accounts);

    // INSTANCE OF THE QANX CONTRACT
    let Q;

    // CREATE NEW INSTANCE OF QANX
    before(async () => {
        Q = await QANX.new();

        // PRINT ACCOUNT MAP
        console.log("\n\nACCOUNTS :: ", acc, "\n\n");
    });

    // INITIALIZE CONTRACT
    it('should init the QANX contract with correct total supply', async () => {
        let totalSupply = await Q.totalSupply();
        assert.equal(totalSupply.toString(), utils.eth2wei('333333000'));
        
    });

    // FUND CREATOR'S ADDRESS
    it('should fund contract creator address with total supply', async () => {
        let balance = await Q.balanceOf(acc.creator);
        assert.equal(balance.toString(), utils.eth2wei('333333000'));
    });

    // TEST NORMAL TRANSFER
    it('should perform a regular transfer', async () => {
        let transferAmount = utils.bn(utils.eth2wei('200000'));
        let creatorPreBalance = await Q.balanceOf(acc.creator);
        await Q.transfer(acc.random('transferBeneficiary'), transferAmount);
        let creatorPostBalance = await Q.balanceOf(acc.creator);
        let receiverBalance = await Q.balanceOf(acc.random('transferBeneficiary'));
        assert.equal(creatorPostBalance.toString(), creatorPreBalance.sub(transferAmount).toString(), 'creator postBalance mistmatch!');
        assert.equal(receiverBalance.toString(), transferAmount.toString(), 'Receiver balance mismatch!');
    });

    // TEST LOCKED TRANSFER
    it('should perform a locked transfer', async () => {

        // DEFINE LOCK PARAMS
        const lock = {
            tokenAmount: utils.bn(utils.eth2wei('100000')),
            hardLockUntil: utils.timestamp(+60),
            softLockUntil: utils.timestamp(+120),
            allowedHops: 0
        };

        const creatorPreBalance = await Q.balanceOf(acc.creator);
        await Q.transferLocked(
            acc.lockedReceiver,
            lock.tokenAmount,
            lock.hardLockUntil,
            lock.softLockUntil,
            lock.allowedHops
        );

        const creatorPostBalance = await Q.balanceOf(acc.creator);
        const receiverBalance = await Q.balanceOf(acc.lockedReceiver);

        assert.equal(creatorPostBalance.toString(), creatorPreBalance.sub(lock.tokenAmount).toString(), 'creator postBalance mistmatch!');
        assert.equal(receiverBalance.toString(), lock.tokenAmount.toString(), 'Receiver balance mismatch!');

        const regLock = await Q.lockOf(acc.lockedReceiver);
        for(const lockKey in lock){
            assert.equal(regLock[lockKey].toString(), lock[lockKey].toString(), `${lockKey} was not registered correctly!`);
        }
    });
});
