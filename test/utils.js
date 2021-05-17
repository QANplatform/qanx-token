const crypto = require('crypto');

module.exports = {

    acc: accounts => {
        const accMap =  {
            owner: accounts[0],
            cancelledBuyer: accounts[1],
            lateBuyer: accounts[2],
            purchasingBuyer: accounts[3],
            etherClaimBeneficiary: accounts[4],
            random: seed => {
                return '0x' + crypto.createHash('sha256')
                    .update(seed)
                    .digest()
                    .slice(0,20)
                    .toString('hex')
            }
        };
        return accMap;
    },

    bn: input => web3.utils.toBN(input),

    eth2wei: eth => {
        eth = web3.utils.toBN(eth);
        const base = web3.utils.toBN(10);
        const exponent = web3.utils.toBN(18);
        return eth.mul(base.pow(exponent)).toString();
    },

    wei2eth: wei => {
        wei = web3.utils.toBN(wei);
        const base = web3.utils.toBN(10);
        const exponent = web3.utils.toBN(18);
        return wei.div(base.pow(exponent)).toString();
    },

    timeout: function(ms){
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
