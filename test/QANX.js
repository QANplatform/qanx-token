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
});
