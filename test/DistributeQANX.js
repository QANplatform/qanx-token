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
    
});
