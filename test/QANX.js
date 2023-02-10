const crypto = require('crypto');
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const privkeys = require('../utils/acc-keys');
const signCheque = require('../utils/signcheque');

describe("QANX", function () {
    
    async function deployFixture() {

        const [chequeSignerInitial, chequeSigner] = await ethers.getSigners();

        const QANX = await ethers.getContractFactory("QANX");
        const qanx = await QANX.deploy();
        const { chainId } = await ethers.provider.getNetwork();

        return { qanx, chequeSignerInitial, chequeSigner, chainId };
    }

    async function encashFixture() {
        const { qanx, chequeSignerInitial, chainId } = await deployFixture();
        const [,, spender, recipient] = await ethers.getSigners();
        const signer = privkeys[chequeSignerInitial.address];
        const amount = ethers.utils.parseUnits('1000000');
        const cheque = signCheque(signer, chainId, qanx.address, spender.address, amount);
        await qanx.encashCheque(
            cheque.beneficiary,
            cheque.amount,
            cheque.hardLockUntil,
            cheque.softLockUntil,
            cheque.allowedHops,
            cheque.signature
        );
        return { qanx: await qanx.connect(spender), spender, recipient };
    }

    async function lockFixture() {
        const { qanx, spender, recipient } = await encashFixture();
    
        // DEFINE LOCK PARAMS
        const lock = {
            tokenAmount: ethers.utils.parseUnits('100000'),
            hardLockUntil: timestamp(+15),
            softLockUntil: timestamp(+30),
            allowedHops: 0
        };

        await qanx.transferLocked(
            recipient.address,
            lock.tokenAmount,
            lock.hardLockUntil,
            lock.softLockUntil,
            lock.allowedHops
        );

        return { qanx, spender, recipient, lock };
    }

    describe("Deployment", function () {
        it("Should deploy token with correct total supply", async function () {
            const { qanx } = await loadFixture(deployFixture);
            const totalSupply = await qanx.totalSupply();
            expect(totalSupply).to.equal('3333333000000000000000000000');
        });

        it("Should credit whole supply to contract itself", async function () {
            const { qanx } = await loadFixture(deployFixture);
            const totalSupply = await qanx.totalSupply();
            const selfBalance = await qanx.balanceOf(qanx.address);
            expect(totalSupply).to.equal(selfBalance);
        });
    });

    describe("Cheque operations", function () {

        it('should sign and encash a cheque', async () => {
            const { qanx, chequeSignerInitial, chainId } = await loadFixture(deployFixture);
            const [,, chequeRecipient1] = await ethers.getSigners();
            const signer = privkeys[chequeSignerInitial.address];
            const amount = ethers.utils.parseUnits('1000');
            const cheque1 = signCheque(signer, chainId, qanx.address, chequeRecipient1.address, amount);
            await expect(qanx.encashCheque(
                cheque1.beneficiary,
                cheque1.amount,
                cheque1.hardLockUntil,
                cheque1.softLockUntil,
                cheque1.allowedHops,
                cheque1.signature
            )).to.emit(qanx, "Transfer").withArgs(
                qanx.address,
                chequeRecipient1.address,
                amount
            );

            expect(await qanx.balanceOf(chequeRecipient1.address)).to.equal(amount);
            expect(await qanx.lockedBalanceOf(chequeRecipient1.address)).to.equal(0);
            expect(await qanx.unlockedBalanceOf(chequeRecipient1.address)).to.equal(amount);
        });

        it('should not encash a cheque after signer delegation', async function () {

            const { qanx, chequeSignerInitial, chainId, chequeSigner } = await loadFixture(deployFixture);
            const [,, chequeRecipient1] = await ethers.getSigners();
            const signer = privkeys[chequeSignerInitial.address];
            const amount = ethers.utils.parseUnits('1000');
            const cheque1 = signCheque(signer, chainId, qanx.address, chequeRecipient1.address, amount);
            await qanx.setChequeSigner(chequeSigner.address, {
                from: chequeSignerInitial.address
            });
            await expect(qanx.encashCheque(
                cheque1.beneficiary,
                cheque1.amount,
                cheque1.hardLockUntil,
                cheque1.softLockUntil,
                cheque1.allowedHops,
                cheque1.signature
            )).to.be.revertedWith('Cheque signature is invalid!');
        });

        it('should not let previous cheque signer delegate', async function () {

            const { qanx, chequeSignerInitial, chequeSigner } = await loadFixture(deployFixture);
            
            await qanx.setChequeSigner(chequeSigner.address, {
                from: chequeSignerInitial.address
            });

            await expect(qanx.setChequeSigner(chequeSignerInitial.address, {
                from: chequeSignerInitial.address
            })).to.be.revertedWith('Invalid cheque signer');
        });

        it('should let delegated signer sign cheques', async () => {
            const { qanx, chequeSignerInitial, chainId, chequeSigner } = await loadFixture(deployFixture);
            const [,,, chequeRecipient2] = await ethers.getSigners();
            const signer = privkeys[chequeSigner.address];
            const amount = ethers.utils.parseUnits('2000');
            const cheque1 = signCheque(signer, chainId, qanx.address, chequeRecipient2.address, amount);
            await qanx.setChequeSigner(chequeSigner.address, {
                from: chequeSignerInitial.address
            });
            await expect(qanx.encashCheque(
                cheque1.beneficiary,
                cheque1.amount,
                cheque1.hardLockUntil,
                cheque1.softLockUntil,
                cheque1.allowedHops,
                cheque1.signature
            )).to.emit(qanx, "Transfer").withArgs(
                qanx.address,
                chequeRecipient2.address,
                amount
            );

            expect(await qanx.balanceOf(chequeRecipient2.address)).to.equal(amount);
            expect(await qanx.lockedBalanceOf(chequeRecipient2.address)).to.equal(0);
            expect(await qanx.unlockedBalanceOf(chequeRecipient2.address)).to.equal(amount);
        });

        it('should not let override cheque beneficiary', async () => {
            const { qanx, chequeSignerInitial, chainId } = await loadFixture(deployFixture);
            const [,, chequeRecipient1, chequeRecipient2] = await ethers.getSigners();
            const signer = privkeys[chequeSignerInitial.address];
            const amount = ethers.utils.parseUnits('1000');
            const cheque1 = signCheque(signer, chainId, qanx.address, chequeRecipient1.address, amount);
            await expect(qanx.encashCheque(
                chequeRecipient2.address,
                cheque1.amount,
                cheque1.hardLockUntil,
                cheque1.softLockUntil,
                cheque1.allowedHops,
                cheque1.signature
            )).to.be.revertedWith('Cheque signature is invalid!');
        });

        it('should not let any cheques to be encashed twice', async () => {
            const { qanx, chequeSignerInitial, chainId } = await loadFixture(deployFixture);
            const [,, chequeRecipient1] = await ethers.getSigners();
            const signer = privkeys[chequeSignerInitial.address];
            const amount = ethers.utils.parseUnits('1000');
            const cheque1 = signCheque(signer, chainId, qanx.address, chequeRecipient1.address, amount);

            await expect(qanx.encashCheque(
                cheque1.beneficiary,
                cheque1.amount,
                cheque1.hardLockUntil,
                cheque1.softLockUntil,
                cheque1.allowedHops,
                cheque1.signature
            )).to.emit(qanx, "Transfer").withArgs(
                qanx.address,
                chequeRecipient1.address,
                amount
            );

            expect(await qanx.balanceOf(chequeRecipient1.address)).to.equal(amount);
            expect(await qanx.lockedBalanceOf(chequeRecipient1.address)).to.equal(0);
            expect(await qanx.unlockedBalanceOf(chequeRecipient1.address)).to.equal(amount);

            await expect(qanx.encashCheque(
                cheque1.beneficiary,
                cheque1.amount,
                cheque1.hardLockUntil,
                cheque1.softLockUntil,
                cheque1.allowedHops,
                cheque1.signature
            )).to.be.revertedWith('This cheque was encashed already!');
        });

        it('should reject cheque with wrong hard & softlock parameters', async () => {
            const { qanx, chequeSignerInitial, chainId } = await loadFixture(deployFixture);
            const [,, chequeRecipient1] = await ethers.getSigners();
            const signer = privkeys[chequeSignerInitial.address];
            const amount = ethers.utils.parseUnits('1000');
            const timeNow = Math.round(+new Date / 1000)
            const cheque1 = signCheque(signer, chainId, qanx.address, chequeRecipient1.address, amount, timeNow, timeNow - 1);
            await expect(qanx.encashCheque(
                cheque1.beneficiary,
                cheque1.amount,
                cheque1.hardLockUntil,
                cheque1.softLockUntil,
                cheque1.allowedHops,
                cheque1.signature
            )).to.be.revertedWith('SoftLock must be >= HardLock!');
        });

        it('should encash cheque with correct hard & softlock parameters', async () => {
            const { qanx, chequeSignerInitial, chainId } = await loadFixture(deployFixture);
            const [,, chequeRecipient1] = await ethers.getSigners();
            const signer = privkeys[chequeSignerInitial.address];
            const amount = ethers.utils.parseUnits('1000');
            const oneHourLater = Math.round(+new Date / 1000) + 3600;
            const cheque1 = signCheque(signer, chainId, qanx.address, chequeRecipient1.address, amount, oneHourLater, oneHourLater);
            
            await expect(qanx.encashCheque(
                cheque1.beneficiary,
                cheque1.amount,
                cheque1.hardLockUntil,
                cheque1.softLockUntil,
                cheque1.allowedHops,
                cheque1.signature
            )).to.emit(qanx, "LockApplied").withArgs(
                chequeRecipient1.address,
                amount,
                oneHourLater,
                oneHourLater,
                0
            ).to.emit(qanx, "Transfer").withArgs(
                qanx.address,
                chequeRecipient1.address,
                amount
            );

            expect(await qanx.balanceOf(chequeRecipient1.address)).to.equal(amount);
            expect(await qanx.lockedBalanceOf(chequeRecipient1.address)).to.equal(amount);
            expect(await qanx.unlockedBalanceOf(chequeRecipient1.address)).to.equal(0);
        });
    });

    describe("Locked transfers", function () {
        it('should perform a locked transfer', async () => {

            const { qanx, spender, recipient } = await loadFixture(encashFixture);
    
            // DEFINE LOCK PARAMS
            const lock = {
                tokenAmount: ethers.utils.parseUnits('100000'),
                hardLockUntil: timestamp(+15),
                softLockUntil: timestamp(+30),
                allowedHops: 0
            };
    
            const spenderPreBalance = await qanx.balanceOf(spender.address);
            await qanx.transferLocked(
                recipient.address,
                lock.tokenAmount,
                lock.hardLockUntil,
                lock.softLockUntil,
                lock.allowedHops
            );
    
            const spenderPostBalance = await qanx.balanceOf(spender.address);
            const receiverBalance = await qanx.balanceOf(recipient.address);
    
            expect(spenderPostBalance).to.equal(spenderPreBalance.sub(lock.tokenAmount));
            expect(receiverBalance).to.equal(lock.tokenAmount);
    
            const regLock = await qanx.lockOf(recipient.address);
            for(const lockKey in lock){
                expect(regLock[lockKey]).to.equal(lock[lockKey]);
            }
    
            const lockedBalance = await qanx.lockedBalanceOf(recipient.address);
            expect(lockedBalance).to.equal(lock.tokenAmount);
        });

        it('should not perform a locked transfer if not enough balance', async () => {

            const { qanx, recipient } = await loadFixture(encashFixture);
    
            // DEFINE LOCK PARAMS
            const lock = {
                tokenAmount: ethers.utils.parseUnits('10000000'),
                hardLockUntil: timestamp(+15),
                softLockUntil: timestamp(+30),
                allowedHops: 0
            };
    
            await expect(qanx.transferLocked(
                recipient.address,
                lock.tokenAmount,
                lock.hardLockUntil,
                lock.softLockUntil,
                lock.allowedHops
            )).to.be.revertedWith('Transfer amount exceeds balance');
        });

        it('should not perform a locked transfer with incorrect hardLock timestamp', async () => {

            const { qanx, recipient } = await loadFixture(encashFixture);
    
            // DEFINE LOCK PARAMS
            const lock = {
                tokenAmount: ethers.utils.parseUnits('1000'),
                hardLockUntil: timestamp(-1),
                softLockUntil: timestamp(+30),
                allowedHops: 0
            };
    
            await expect(qanx.transferLocked(
                recipient.address,
                lock.tokenAmount,
                lock.hardLockUntil,
                lock.softLockUntil,
                lock.allowedHops
            )).to.be.revertedWith('HardLock must be in the future!');
        });

        /////
        it('should increase unlockableBalanceOf as time is passing', async () => {

            const { qanx, recipient } = await loadFixture(encashFixture);

            const lock = {
                tokenAmount: ethers.utils.parseUnits('100000'),
                hardLockUntil: timestamp(+13),
                softLockUntil: timestamp(+17),
                allowedHops: 0
            };

            await qanx.transferLocked(
                recipient.address,
                lock.tokenAmount,
                lock.hardLockUntil,
                lock.softLockUntil,
                lock.allowedHops
            );
            
            const regLock = await qanx.lockOf(recipient.address);

            let currentBlock = await ethers.provider.getBlock();

            // WHILE HARDLOCK DID NOT PASS
            while(regLock.hardLockUntil > currentBlock.timestamp){

                // UNLOCKABLE BALANCE SHOULD BE ZERO
                const unlockable = await qanx.unlockableBalanceOf(recipient.address);
                expect(unlockable).to.equal(0, 'Unlockable balance was not zero before hardlock passed!');

                // INCREASE block.timestamp IN TEST ENVIRONMENT
                await ethers.provider.send("evm_mine", [currentBlock.timestamp + 1]);
                currentBlock = await ethers.provider.getBlock();
            }

            let previousUnlockable = ethers.utils.parseUnits('0');

            // LOOP WHILE THE SOFTLOCK PERIOD LASTS
            while(regLock.softLockUntil > currentBlock.timestamp){

                // INCREASE block.timestamp IN TEST ENVIRONMENT
                await ethers.provider.send("evm_mine", [currentBlock.timestamp + 1]);
                currentBlock = await ethers.provider.getBlock();

                // GET UNLOCKABLE BALANCE AT THE CURRENT TIME
                const unlockable = await qanx.unlockableBalanceOf(recipient.address);

                // CURRENT UNLOCKABLE AMOUNT SHOULD BE GREATER THAN THE PREVIOUS AMOUNT AS TIME PASSES
                expect(previousUnlockable).to.be.lessThan(unlockable, "Unlockable amount did not increase!");

                // SET PREVIOUS UNLOCKABLE AMOUNT TO CURRENT ONE, WAIT 1s+ UNTIL NEXT CYCLE
                previousUnlockable = unlockable;
            }
        });

        it('should not let another lock policy applied', async () => {

            const { qanx, recipient } = await loadFixture(encashFixture);

            const lock1 = {
                tokenAmount: ethers.utils.parseUnits('100000'),
                hardLockUntil: timestamp(+13),
                softLockUntil: timestamp(+17),
                allowedHops: 0
            };

            const lock2 = {
                tokenAmount: ethers.utils.parseUnits('100000'),
                hardLockUntil: timestamp(+12),
                softLockUntil: timestamp(+18),
                allowedHops: 2
            };

            await qanx.transferLocked(
                recipient.address,
                lock1.tokenAmount,
                lock1.hardLockUntil,
                lock1.softLockUntil,
                lock1.allowedHops
            );

            await expect(qanx.transferLocked(
                recipient.address,
                lock2.tokenAmount,
                lock2.hardLockUntil,
                lock2.softLockUntil,
                lock2.allowedHops
            )).to.be.revertedWith("Only one lock params per address allowed!");   
        });

        it('should let the same lock policy applied again', async () => {

            const { qanx, spender, recipient, lock } = await loadFixture(lockFixture);
            
            const nextAmount = ethers.utils.parseUnits('200');

            await expect(qanx.transferLocked(
                recipient.address,
                nextAmount,
                lock.hardLockUntil,
                lock.softLockUntil,
                lock.allowedHops
            )).to.emit(qanx, 'Transfer')
            .withArgs(spender.address, recipient.address, nextAmount)
            .to.emit(qanx, 'LockApplied')
            .withArgs(
                recipient.address,
                lock.tokenAmount.add(nextAmount),
                lock.hardLockUntil,
                lock.softLockUntil,
                lock.allowedHops
            );
        });

        

        it('should not let allow negative hops', async () => {

            const { qanx, recipient } = await loadFixture(encashFixture);
    
            // DEFINE LOCK PARAMS
            const lock = {
                tokenAmount: ethers.utils.parseUnits('100000'),
                hardLockUntil: timestamp(+15),
                softLockUntil: timestamp(+30),
                allowedHops: -1
            };

            const expectedError = 'value out-of-bounds';
            let actualError;

            try {
                await qanx.transferLocked(
                    recipient.address,
                    lock.tokenAmount,
                    lock.hardLockUntil,
                    lock.softLockUntil,
                    lock.allowedHops
                );
            } catch (e) {
                if(e && e.reason){
                    actualError = e.reason;
                }
            }
            expect(actualError).to.equal(expectedError);
        });

        it('should fail to transfer locked tokens further if no hops allowed', async () => {

            let { qanx, recipient, lock } = await loadFixture(lockFixture);
            const [,,,, recipient3] = await ethers.getSigners();

            qanx = qanx.connect(recipient);

            await expect(qanx.transferLocked(
                recipient3.address,
                lock.tokenAmount,
                lock.hardLockUntil,
                lock.softLockUntil,
                lock.allowedHops
            )).to.be.revertedWith('Only same / stricter lock params allowed!');
        });

        it('should allow to transfer locked tokens further if hops are allowed', async () => {

            let { qanx, spender, recipient } = await loadFixture(encashFixture);
            const [,,,, nextRecipient] = await ethers.getSigners();

            const lock = {
                tokenAmount: ethers.utils.parseUnits('100000'),
                hardLockUntil: timestamp(+15),
                softLockUntil: timestamp(+30),
                allowedHops: 1
            };

            await expect(qanx.transferLocked(
                recipient.address,
                lock.tokenAmount,
                lock.hardLockUntil,
                lock.softLockUntil,
                lock.allowedHops
            )).to.emit(qanx, 'Transfer').withArgs(spender.address, recipient.address, lock.tokenAmount)
            .to.emit(qanx, 'LockApplied')
            .withArgs(
                recipient.address,
                lock.tokenAmount,
                lock.hardLockUntil,
                lock.softLockUntil,
                lock.allowedHops
            )

            qanx = qanx.connect(recipient);

            await expect(qanx.transferLocked(
                nextRecipient.address,
                lock.tokenAmount,
                lock.hardLockUntil,
                lock.softLockUntil,
                lock.allowedHops - 1
            )).to.emit(qanx, 'Transfer').withArgs(recipient.address, nextRecipient.address, lock.tokenAmount)
            .to.emit(qanx, 'LockApplied')
            .withArgs(
                nextRecipient.address,
                lock.tokenAmount,
                lock.hardLockUntil,
                lock.softLockUntil,
                lock.allowedHops - 1
            );
        });

        it('should allow to transfer locked tokens further if hops are allowed with mixed balance', async () => {

            let { qanx, spender, recipient } = await loadFixture(encashFixture);
            const [,,,, nextRecipient] = await ethers.getSigners();

            const amounts = {
                unlocked:  ethers.utils.parseUnits('600'),
                locked: ethers.utils.parseUnits('600'),
                total: ethers.utils.parseUnits('1000')
            };

            await qanx.transfer(
                recipient.address,
                amounts.unlocked
            );

            const lock = {
                tokenAmount: amounts.locked,
                hardLockUntil: timestamp(+15),
                softLockUntil: timestamp(+30),
                allowedHops: 1
            };

            await expect(qanx.transferLocked(
                recipient.address,
                lock.tokenAmount,
                lock.hardLockUntil,
                lock.softLockUntil,
                lock.allowedHops
            )).to.emit(qanx, 'Transfer').withArgs(spender.address, recipient.address, lock.tokenAmount)
            .to.emit(qanx, 'LockApplied')
            .withArgs(
                recipient.address,
                lock.tokenAmount,
                lock.hardLockUntil,
                lock.softLockUntil,
                lock.allowedHops
            )

            qanx = qanx.connect(recipient);

            await expect(qanx.transferLocked(
                nextRecipient.address,
                amounts.total,
                lock.hardLockUntil,
                lock.softLockUntil,
                lock.allowedHops - 1
            )).to.emit(qanx, 'Transfer').withArgs(recipient.address, nextRecipient.address, amounts.total)
            .to.emit(qanx, 'LockApplied')
            .withArgs(
                nextRecipient.address,
                amounts.total,
                lock.hardLockUntil,
                lock.softLockUntil,
                lock.allowedHops - 1
            );
        });

        it('should let approved spenders send locked tokens', async () => {

            const { qanx, spender, recipient } = await loadFixture(encashFixture);
            const [,,,,approved] = await ethers.getSigners();
            const tokenAmount = ethers.utils.parseUnits('1000');

            // MAKE APPROVAL TX
            await qanx.approve(
                approved.address,
                tokenAmount
            );
    
            // DEFINE LOCK PARAMS
            const lock = {
                tokenAmount,
                hardLockUntil: timestamp(+15),
                softLockUntil: timestamp(+30),
                allowedHops: 10
            };

            const qanxWithApprovedSigner = qanx.connect(approved);

            await expect(qanxWithApprovedSigner.transferFromLocked(
                spender.address,
                recipient.address,
                lock.tokenAmount,
                lock.hardLockUntil,
                lock.softLockUntil,
                lock.allowedHops
            )).to.emit(qanx, 'Transfer').withArgs(spender.address, recipient.address, lock.tokenAmount)
            .to.emit(qanx, 'LockApplied')
            .withArgs(
                recipient.address,
                lock.tokenAmount,
                lock.hardLockUntil,
                lock.softLockUntil,
                lock.allowedHops
            );
        });

        it('should perform zero address validation', async () => {
            const { qanx } = await loadFixture(encashFixture);
    
            // DEFINE LOCK PARAMS
            const lock = {
                tokenAmount: ethers.utils.parseUnits('100000'),
                hardLockUntil: timestamp(+15),
                softLockUntil: timestamp(+30),
                allowedHops: 0
            };

            await expect(qanx.transferLocked(
                ethers.constants.AddressZero,
                lock.tokenAmount,
                lock.hardLockUntil,
                lock.softLockUntil,
                lock.allowedHops
            )).to.be.revertedWith('ERC20: transfer to the zero address');
        });

        it('should let approved spenders send locked tokens with unlimited approval', async () => {

            const { qanx, spender, recipient } = await loadFixture(encashFixture);
            const [,,,,approved] = await ethers.getSigners();
            const tokenAmount = ethers.utils.parseUnits('1000');

            // MAKE APPROVAL TX
            await qanx.approve(
                approved.address,
                ethers.constants.MaxUint256
            );
    
            // DEFINE LOCK PARAMS
            const lock = {
                tokenAmount,
                hardLockUntil: timestamp(+15),
                softLockUntil: timestamp(+30),
                allowedHops: 10
            };

            const qanxWithApprovedSigner = qanx.connect(approved);

            await expect(qanxWithApprovedSigner.transferFromLocked(
                spender.address,
                recipient.address,
                lock.tokenAmount,
                lock.hardLockUntil,
                lock.softLockUntil,
                lock.allowedHops
            )).to.emit(qanx, 'Transfer').withArgs(spender.address, recipient.address, lock.tokenAmount)
            .to.emit(qanx, 'LockApplied')
            .withArgs(
                recipient.address,
                lock.tokenAmount,
                lock.hardLockUntil,
                lock.softLockUntil,
                lock.allowedHops
            );
        });

        it('should not let approved spenders send locked tokens if not enough approved', async () => {

            const { qanx, spender, recipient } = await loadFixture(encashFixture);
            const [,,,,approved] = await ethers.getSigners();

            // MAKE APPROVAL TX
            await qanx.approve(
                approved.address,
                ethers.utils.parseUnits('1000')
            );
    
            // DEFINE LOCK PARAMS
            const lock = {
                tokenAmount: ethers.utils.parseUnits('1001'),
                hardLockUntil: timestamp(+15),
                softLockUntil: timestamp(+30),
                allowedHops: 10
            };

            const qanxWithApprovedSigner = qanx.connect(approved);

            await expect(qanxWithApprovedSigner.transferFromLocked(
                spender.address,
                recipient.address,
                lock.tokenAmount,
                lock.hardLockUntil,
                lock.softLockUntil,
                lock.allowedHops
            )).to.be.revertedWith('ERC20: transfer amount exceeds allowance');
        });
    });

    describe("Token unlocks", function () {
        it('should not be able to call unlock() before hardlocktime', async () => {

            const { qanx, recipient, lock } = await loadFixture(lockFixture);
    
            const regLock = await qanx.lockOf(recipient.address);
            
            for(const lockKey in lock){
                expect(regLock[lockKey]).to.equal(lock[lockKey], `${lockKey} was not registered correctly!`);
            }

            expect(regLock.hardLockUntil).to.be.greaterThan(timestamp());
            await expect(qanx.unlock(recipient.address)).to.be.revertedWith('No unlockable tokens!');
        });

        it('should unlock whole amount and delete lock', async () => {

            const { qanx, recipient } = await loadFixture(lockFixture);

            const regLock = await qanx.lockOf(recipient.address);

            // INCREASE block.timestamp IN TEST ENVIRONMENT
            await ethers.provider.send("evm_mine", [parseInt(regLock.softLockUntil.toString()) + 1]);

            await expect(qanx.unlock(recipient.address)).to.emit(qanx, 'LockRemoved').withArgs(recipient.address);
            const lockedBalanceOf = await qanx.lockedBalanceOf(recipient.address);
            expect(lockedBalanceOf).to.equal(0, "unlock() method failed!");
        });

        it('should gradually unlock the balance between hard and softLock', async () => {

            const { qanx, recipient } = await loadFixture(lockFixture);
    
            const regLock = await qanx.lockOf(recipient.address);
    
           // INCREASE block.timestamp IN TEST ENVIRONMENT
           await ethers.provider.send("evm_mine", [parseInt(regLock.hardLockUntil.toString()) + 1]);
    
            let previousUnlocked = ethers.utils.parseUnits('0');

            let currentBlock = await ethers.provider.getBlock();
    
            // LOOP WHILE THE SOFTLOCK PERIOD LASTS
            while(regLock.softLockUntil > currentBlock.timestamp){
    
                // INCREASE block.timestamp IN TEST ENVIRONMENT
                await ethers.provider.send("evm_mine", [currentBlock.timestamp + 2]);
                currentBlock = await ethers.provider.getBlock();
    
                // UNLOCK AS MUCH BALANCE AS POSSIBLE
                await qanx.unlock(recipient.address);
    
                // GET UNLOCKABLE BALANCE AT THE CURRENT TIME
                const unlocked = await qanx.unlockedBalanceOf(recipient.address);
    
                // CURRENT UNLOCKABLE AMOUNT SHOULD BE GREATER THAN THE PREVIOUS AMOUNT AS TIME PASSES
                expect(unlocked).to.be.greaterThan(previousUnlocked, "Unlocked balance did not increase!");
    
                // SET PREVIOUS UNLOCKABLE AMOUNT TO CURRENT ONE, WAIT 1s+ UNTIL NEXT CYCLE
                previousUnlocked = unlocked;
            }
    
            // INCREASE block.timestamp IN TEST ENVIRONMENT
            await timeout(2000);
            await ethers.provider.send("evm_mine", [currentBlock.timestamp + 2]);
            
            // UNLOCK THE REST OF THE BALANCE IF THERE IS ANYTHING LEFT
            try{
                await qanx.unlock(recipient.address);
            }catch(e){}
            
            const locked = await qanx.lockedBalanceOf(recipient.address);
            const unlocked = await qanx.unlockedBalanceOf(recipient.address);
            const total = await qanx.balanceOf(recipient.address);
    
            expect(locked).to.equal(0);
            expect(unlocked).to.equal(total);
        });
    });

    describe("Miscellaneous", function () {
        it('should revert any kind of payment to the contract', async () => {

            const { qanx, chequeSignerInitial } = await loadFixture(deployFixture);

            await expect(chequeSignerInitial.sendTransaction({
                to: qanx.address,
                value: ethers.utils.parseEther('1')
            })).to.be.reverted;
        });

        it('should revert any non-existent method call', async () => {
            const { qanx, chequeSignerInitial } = await loadFixture(deployFixture);

            await expect(chequeSignerInitial.sendTransaction({
                to: qanx.address,
                data: crypto.randomBytes(32)
            })).to.be.reverted;
        });

        it('should reject high s value in verifyChequeSignature() method', async () => {
            const { qanx } = await loadFixture(deployFixture);
            await expect(qanx.encashCheque(
                ethers.constants.AddressZero,
                ethers.constants.MaxUint256,
                timestamp(+60),
                timestamp(+60),
                0,
                [
                    ethers.utils.randomBytes(32),
                    ethers.constants.MaxUint256
                ]
            )).to.be.revertedWith('Cheque signature is invalid!')
        });
    });
});

function timestamp(deltaSeconds) {
    return Math.round(+new Date / 1000) + parseInt(deltaSeconds ? deltaSeconds : 0);
}

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
