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
        assert.equal(totalSupply.toString(), utils.eth2wei('3333333000'));
        
    });

    // FUND CREATOR'S ADDRESS
    it('should fund contract creator address with total supply', async () => {
        let balance = await Q.balanceOf(acc.creator);
        assert.equal(balance.toString(), utils.eth2wei('3333333000'));
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
            hardLockUntil: utils.timestamp(+15),
            softLockUntil: utils.timestamp(+30),
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

        const lockedBalanceOf = await Q.lockedBalanceOf(acc.lockedReceiver);
        assert.equal(lockedBalanceOf.toString(), lock.tokenAmount.toString(), "lockedBalanceOf() method failed!");
    });

    it('unlockableBalanceOf should increase as time is passing', async () => {
        
        const regLock = await Q.lockOf(acc.lockedReceiver);

        // WHILE HARDLOCK DID NOT PASS
        while(regLock.hardLockUntil > utils.timestamp()){

            // UNLOCKABLE BALANCE SHOULD BE ZERO
            const unlockable = await Q.unlockableBalanceOf(acc.lockedReceiver);
            assert.equal(unlockable.toString(), '0', "Unlockable balance was not zero before hardlock passed!");

            // PRINT INFORMATIVE WAITING MESSAGE
            console.log(`Waiting ${regLock.hardLockUntil - utils.timestamp()} seconds until hardlock passes...`)
            await utils.timeout(5000);
        }
        console.log("Hardlock passed!");
        await utils.timeout(2000);

        let previousUnlockable = utils.bn('0');

        // LOOP WHILE THE SOFTLOCK PERIOD LASTS
        while(regLock.softLockUntil > utils.timestamp()){

            // RANDOM TX TO INCREASE block.timestamp IN TEST ENVIRONMENT
            await web3.eth.sendTransaction({from: accounts[0], to: accounts[0], value: 0 });

            // GET UNLOCKABLE BALANCE AT THE CURRENT TIME
            const unlockable = await Q.unlockableBalanceOf(acc.lockedReceiver);

            // CURRENT UNLOCKABLE AMOUNT SHOULD BE GREATER THAN THE PREVIOUS AMOUNT AS TIME PASSES
            assert(parseInt(utils.wei2eth(previousUnlockable)) < parseInt(utils.wei2eth(unlockable)), "Unlockable amount did not increase!");

            // SET PREVIOUS UNLOCKABLE AMOUNT TO CURRENT ONE, WAIT 1s+ UNTIL NEXT CYCLE
            previousUnlockable = unlockable;
            await utils.timeout(1100);
        }
    });

    it('should not let another lock policy applied', async () => {

        // SHOULD NOT LET UNLOCK BALANCE
        const expectedError = 'Only one lock per address allowed!';
        let actualError;
        try {
            await Q.transferLocked(
                acc.lockedReceiver,
                utils.bn(utils.eth2wei('1')),
                utils.timestamp(),
                utils.timestamp(),
                0
            );
        } catch (e) {
            if(e && e.reason){
                actualError = e.reason;
            }
        }
        assert.equal(actualError, expectedError);        
    });

    it('should unlock whole amount and delete lock', async () => {
        const regLock = await Q.lockOf(acc.lockedReceiver);
        while(regLock.softLockUntil > utils.timestamp()){
            await utils.timeout(1000);
        }
        // RANDOM TX TO INCREASE block.timestamp IN TEST ENVIRONMENT
        await web3.eth.sendTransaction({from: accounts[0], to: accounts[0], value: 0 });
        await utils.timeout(1000);

        await Q.unlock(acc.lockedReceiver);
        const lockedBalanceOf = await Q.lockedBalanceOf(acc.lockedReceiver);
        assert.equal(lockedBalanceOf.toString(), '0', "unlock() method failed!");
    });
});
