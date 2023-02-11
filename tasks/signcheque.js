const readline = require('readline');
const signCheque = require('../utils/signcheque');

// This will sign a cheque on mainnet (chainID=1) with QANX contract at 0xCAFE for beneficiary 0xBABE with the amount 1234.56
// npx hardhat signcheque 1 0x000000000000000000000000000000000000CAFE 0x000000000000000000000000000000000000BABE 1234.56
task("signcheque", "Signs a cheque")
    .addPositionalParam("chainid", "The chain ID where the QANX contract is")
    .addPositionalParam("contract", "The address of the QANX contract")
    .addPositionalParam("beneficiary", "The address that will receive the tokens")
    .addPositionalParam("amount", "How many tokens the address will receive")
    .addParam("hardlock", "The hardlock time in YYY-MM-DD format", undefined, undefined, true)
    .addParam("softlock", "The softlock time in YYY-MM-DD format", undefined, undefined, true)
    .addParam("hops", "How many hops can be made with the locked tokens", 0, types.int, true)
    .setAction(async (args, { ethers }) => {

        if (!ethers.utils.isAddress(args.contract)) {
            console.warn(`"${args.contract}" is not a valid address!`);
            process.exit(1);
        }

        if (!ethers.utils.isAddress(args.beneficiary)) {
            console.warn(`"${args.beneficiary}" is not a valid address!`);
            process.exit(1);
        }

        if (args.amount) {
            args.amount = ethers.utils.parseUnits(args.amount);
        }

        if (args.softlock) {
            args.softlock = Math.round(
                new Date(args.softlock).getTime() / 1000
            );
        }

        if (args.hardlock) {
            args.hardlock = Math.round(
                new Date(args.hardlock).getTime() / 1000
            );
        }

        const signingKey = await askSigningKey();
        const cheque = signCheque(signingKey, args.chainid, args.contract, args.beneficiary, args.amount, args.hardlock, args.softlock, args.hops);
        
        console.log('CHEQUE ::', cheque);
    });


function askSigningKey() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.stdoutMuted = true;

    return new Promise(resolve => {
        rl.question('Signing key: ', function(skey) {
            rl.close();
            process.stdout.write("\n");
            resolve(skey);
        });
        rl._writeToOutput = function _writeToOutput(stringToWrite) {
            if (!rl.stdoutMuted){
                rl.output.write(stringToWrite);
                return;
            }
        };
    });
}
