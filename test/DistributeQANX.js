const QANX = artifacts.require('QANX');
const DistributeQANX = artifacts.require('DistributeQANX');
const utils = require('./utils');
const crypto = require('crypto');

const unlockedFurtherTransferable = 200000;
const lockedFurtherTransferable = 100000;

contract("DistributeQANX", async accounts => {

    // EASY ACCOUNT ACCESS
    const acc = utils.acc(accounts);

    // INSTANCES OF THE QANX CONTRACT AND THE DISTRIBUTOR CONTRACT
    let Q, DQ;

    // CREATE NEW INSTANCE OF QANX
    before(async () => {
        Q = await QANX.new();
        DQ = await DistributeQANX.new(Q.address);

        // PRINT ACCOUNT MAP
        console.log("\n\nACCOUNTS :: ", acc, "\n\n");
    });

    // INITIALIZE CONTRACT
    it('should init QANX contract properly', async () => {
        let totalSupply = await Q.totalSupply();
        let balance = await Q.balanceOf(acc.creator);
        assert.equal(totalSupply.toString(), utils.eth2wei('3333333000'));
        assert.equal(balance.toString(), utils.eth2wei('3333333000'));
    });

    it('should distribute unlocked tokens randomly', async () => {
        const params = {
            recipients: [acc.distributeRecv],
            amounts: [utils.eth2wei(unlockedFurtherTransferable)]
        }
        let amount, total = unlockedFurtherTransferable;
        for(let i = 1; i < 100; i++){
            params.recipients[i] = acc.random('unlocked' + i);
            amount = Math.floor(Math.random() * 10000000);
            total += amount;
            params.amounts[i] = utils.eth2wei(amount);
        }
        await Q.approve(DQ.address, utils.eth2wei(total));
        await DQ.distribute(utils.eth2wei(total), params.recipients, params.amounts);
        for(const i in params.recipients){
            const balance = await Q.balanceOf(params.recipients[i]);
            console.log(`${params.recipients[i]} :: ${params.amounts[i]}`);
            assert.equal(balance.toString(), params.amounts[i]);
        }
    });

    it('should transfer distributed unlocked token further', async () => {
        let transferAmount = utils.bn(utils.eth2wei(unlockedFurtherTransferable));
        let unlockedRecvPreBalance = await Q.balanceOf(acc.distributeRecv);
        await Q.transfer(acc.random('transferBeneficiary'), transferAmount, {from: acc.distributeRecv});
        let unlockedRecvPostBalance = await Q.balanceOf(acc.distributeRecv);
        let receiverBalance = await Q.balanceOf(acc.random('transferBeneficiary'));
        assert.equal(unlockedRecvPostBalance.toString(), unlockedRecvPreBalance.sub(transferAmount).toString(), 'Sender postBalance mistmatch!');
        assert.equal(receiverBalance.toString(), transferAmount.toString(), 'Receiver balance mismatch!');
    });

    it('should distribute locked tokens randomly', async () => {
        const params = {
            recipients: [acc.distributeLockedRecv],
            amounts: [utils.eth2wei(lockedFurtherTransferable)],
            hardLocks: [utils.timestamp(+30)],
            softLocks: [utils.timestamp(+60)],
            allowedHops: [1]
        }
        let amount, total = lockedFurtherTransferable;
        for(let i = 1; i < 5; i++){
            params.recipients[i] = acc.random('locked' + i);
            amount = Math.floor(Math.random() * 1000000);
            total += amount;
            params.amounts[i] = utils.eth2wei(amount);
            params.hardLocks[i] = utils.timestamp(+600);
            params.softLocks[i] = utils.timestamp(+900);
            params.allowedHops[i] = 0;
        }
        await Q.approve(DQ.address, utils.eth2wei(total));
        await DQ.distributeLocked(utils.eth2wei(total), params.recipients, params.amounts, params.hardLocks, params.softLocks, params.allowedHops);

        for(const i in params.recipients){
            const balance = await Q.balanceOf(params.recipients[i]);
            const lockedBalance = await Q.lockedBalanceOf(params.recipients[i]);
            const unlockedBalance = await Q.unlockedBalanceOf(params.recipients[i]);
            console.log(`${params.recipients[i]} :: ${params.amounts[i]}`);
            assert.equal(balance.toString(), params.amounts[i]);
            assert.equal(balance.toString(), lockedBalance.toString());
            assert.equal(unlockedBalance.toString(), '0');
        }
    });

});
