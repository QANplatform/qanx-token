const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const privkeys = require('../utils/acc-keys');
const signCheque = require('../utils/signcheque');

describe("ERC20", function () {

    async function deployFixtureErc20() {
        const [chequeSignerInitial, chequeSigner] = await ethers.getSigners();

        const QANX = await ethers.getContractFactory("QANX");
        const qanx = await QANX.deploy();
        const { chainId } = await ethers.provider.getNetwork();

        const signer = privkeys[chequeSignerInitial.address];
        const cheque = signCheque(signer, chainId, qanx.address, chequeSignerInitial.address, await qanx.totalSupply());
        await qanx.encashCheque(
            cheque.beneficiary,
            cheque.amount,
            cheque.hardLockUntil,
            cheque.softLockUntil,
            cheque.allowedHops,
            cheque.signature
        );
        
        return {
            qanx,
            ownerAddress: chequeSignerInitial.address,
            recipientAddress: chequeSigner.address,
            signerContract: qanx.connect(chequeSigner)
        };
    }

    // Test cases
    it("Creates a token with a name", async function () {
        const fixture = await loadFixture(deployFixtureErc20);
        expect(await fixture.qanx.name()).to.exist;
        expect(await fixture.qanx.name()).to.equal("QANX Token");
    });

    it("Creates a token with a symbol", async function () {
        const fixture = await loadFixture(deployFixtureErc20);
        expect(await fixture.qanx.symbol()).to.exist;
        expect(await fixture.qanx.symbol()).to.equal("QANX");
    });

    it("Has a valid decimal", async function () {
        const fixture = await loadFixture(deployFixtureErc20);
        expect((await fixture.qanx.decimals()).toString()).to.equal("18");
    });

    it("Has a valid total supply", async function () {
        const fixture = await loadFixture(deployFixtureErc20);
        const expectedSupply = ethers.utils.parseUnits(
            "3333333000",
            this.decimals
        );
        expect((await fixture.qanx.totalSupply()).toString()).to.equal(
            expectedSupply
        );
    });

    it("Is able to query account balances", async function () {
        const fixture = await loadFixture(deployFixtureErc20);
        const ownerBalance = await fixture.qanx.balanceOf(fixture.ownerAddress);
        expect(await fixture.qanx.balanceOf(fixture.ownerAddress)).to.equal(
            ownerBalance
        );
    });

    it("Transfers the right amount of tokens to/from an account", async function () {
        const fixture = await loadFixture(deployFixtureErc20);
        const transferAmount = 1000;
        await expect(
            fixture.qanx.transfer(fixture.recipientAddress, transferAmount)
        ).to.changeTokenBalances(
            fixture.qanx,
            [fixture.ownerAddress, fixture.recipientAddress],
            [-transferAmount, transferAmount]
        );
    });

    it("Emits a transfer event with the right arguments", async function () {
        const fixture = await loadFixture(deployFixtureErc20);
        const transferAmount = 100000;
        await expect(
            fixture.qanx.transfer(
                fixture.recipientAddress,
                ethers.utils.parseUnits(
                    transferAmount.toString(),
                    this.decimals
                )
            )
        )
            .to.emit(fixture.qanx, "Transfer")
            .withArgs(
                fixture.ownerAddress,
                fixture.recipientAddress,
                ethers.utils.parseUnits(
                    transferAmount.toString(),
                    this.decimals
                )
            );
    });

    it("Allows for allowance approvals and queries", async function () {
        const fixture = await loadFixture(deployFixtureErc20);
        const approveAmount = 10000;
        await fixture.signerContract.approve(
            fixture.ownerAddress,
            ethers.utils.parseUnits(approveAmount.toString(), this.decimals)
        );
        expect(
            await fixture.qanx.allowance(
                fixture.recipientAddress,
                fixture.ownerAddress
            )
        ).to.equal(
            ethers.utils.parseUnits(approveAmount.toString(), this.decimals)
        );
    });

    it("Emits an approval event with the right arguments", async function () {
        const fixture = await loadFixture(deployFixtureErc20);
        const approveAmount = 10000;
        await expect(
            fixture.signerContract.approve(
                fixture.ownerAddress,
                ethers.utils.parseUnits(approveAmount.toString(), this.decimals)
            )
        )
            .to.emit(fixture.qanx, "Approval")
            .withArgs(
                fixture.recipientAddress,
                fixture.ownerAddress,
                ethers.utils.parseUnits(approveAmount.toString(), this.decimals)
            );
    });

    it("Allows an approved spender to transfer from owner", async function () {
        const fixture = await loadFixture(deployFixtureErc20);
        const transferAmount = 10000;
        await fixture.qanx.transfer(
            fixture.recipientAddress,
            ethers.utils.parseUnits(transferAmount.toString(), this.decimals)
        );
        await fixture.signerContract.approve(
            fixture.ownerAddress,
            ethers.utils.parseUnits(transferAmount.toString(), this.decimals)
        );
        await expect(
            fixture.qanx.transferFrom(
                fixture.recipientAddress,
                fixture.ownerAddress,
                transferAmount
            )
        ).to.changeTokenBalances(
            fixture.qanx,
            [fixture.ownerAddress, fixture.recipientAddress],
            [transferAmount, -transferAmount]
        );
    });

    it("Emits a transfer event with the right arguments when conducting an approved transfer", async function () {
        const fixture = await loadFixture(deployFixtureErc20);
        const transferAmount = 10000;
        await fixture.qanx.transfer(
            fixture.recipientAddress,
            ethers.utils.parseUnits(transferAmount.toString(), this.decimals)
        );
        await fixture.signerContract.approve(
            fixture.ownerAddress,
            ethers.utils.parseUnits(transferAmount.toString(), this.decimals)
        );
        await expect(
            fixture.qanx.transferFrom(
                fixture.recipientAddress,
                fixture.ownerAddress,
                ethers.utils.parseUnits(
                    transferAmount.toString(),
                    this.decimals
                )
            )
        )
            .to.emit(fixture.qanx, "Transfer")
            .withArgs(
                fixture.recipientAddress,
                fixture.ownerAddress,
                ethers.utils.parseUnits(
                    transferAmount.toString(),
                    this.decimals
                )
            );
    });

    it("Allows allowance to be increased and queried", async function () {
        const fixture = await loadFixture(deployFixtureErc20);
        const initialAmount = 100;
        const incrementAmount = 10000;
        await fixture.signerContract.approve(
            fixture.ownerAddress,
            ethers.utils.parseUnits(initialAmount.toString(), this.decimals)
        );
        const previousAllowance = await fixture.qanx.allowance(
            fixture.recipientAddress,
            fixture.ownerAddress
        );
        await fixture.signerContract.increaseAllowance(
            fixture.ownerAddress,
            ethers.utils.parseUnits(incrementAmount.toString(), this.decimals)
        );
        const expectedAllowance = ethers.BigNumber.from(previousAllowance).add(
            ethers.BigNumber.from(
                ethers.utils.parseUnits(
                    incrementAmount.toString(),
                    this.decimals
                )
            )
        );
        expect(
            await fixture.qanx.allowance(
                fixture.recipientAddress,
                fixture.ownerAddress
            )
        ).to.equal(expectedAllowance);
    });

    it("Emits approval event when allowance is increased", async function () {
        const fixture = await loadFixture(deployFixtureErc20);
        const incrementAmount = 10000;
        await expect(
            fixture.signerContract.increaseAllowance(
                fixture.ownerAddress,
                ethers.utils.parseUnits(
                    incrementAmount.toString(),
                    this.decimals
                )
            )
        )
            .to.emit(fixture.qanx, "Approval")
            .withArgs(
                fixture.recipientAddress,
                fixture.ownerAddress,
                ethers.utils.parseUnits(
                    incrementAmount.toString(),
                    this.decimals
                )
            );
    });

    it("Allows allowance to be decreased and queried", async function () {
        const fixture = await loadFixture(deployFixtureErc20);
        const initialAmount = 100;
        const decrementAmount = 10;
        await fixture.signerContract.approve(
            fixture.ownerAddress,
            ethers.utils.parseUnits(initialAmount.toString(), this.decimals)
        );
        const previousAllowance = await fixture.qanx.allowance(
            fixture.recipientAddress,
            fixture.ownerAddress
        );
        await fixture.signerContract.decreaseAllowance(
            fixture.ownerAddress,
            ethers.utils.parseUnits(decrementAmount.toString(), this.decimals)
        );
        const expectedAllowance = ethers.BigNumber.from(previousAllowance).sub(
            ethers.BigNumber.from(
                ethers.utils.parseUnits(
                    decrementAmount.toString(),
                    this.decimals
                )
            )
        );
        expect(
            await fixture.qanx.allowance(
                fixture.recipientAddress,
                fixture.ownerAddress
            )
        ).to.equal(expectedAllowance);
    });

    it("Emits approval event when alllowance is decreased", async function () {
        const fixture = await loadFixture(deployFixtureErc20);
        const initialAmount = 100;
        const decrementAmount = 10;
        await fixture.signerContract.approve(
            fixture.ownerAddress,
            ethers.utils.parseUnits(initialAmount.toString(), this.decimals)
        );
        const expectedAllowance = ethers.BigNumber.from(
            ethers.utils.parseUnits(initialAmount.toString(), this.decimals)
        ).sub(
            ethers.BigNumber.from(
                ethers.utils.parseUnits(
                    decrementAmount.toString(),
                    this.decimals
                )
            )
        );
        await expect(
            fixture.signerContract.decreaseAllowance(
                fixture.ownerAddress,
                ethers.utils.parseUnits(
                    decrementAmount.toString(),
                    this.decimals
                )
            )
        )
            .to.emit(fixture.qanx, "Approval")
            .withArgs(
                fixture.recipientAddress,
                fixture.ownerAddress,
                expectedAllowance
            );
    });
});
