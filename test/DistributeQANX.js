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

    
});
