# QANX token

The QANX token was already audited prior to its release by [CertiK](https://www.certik.org/projects/qanx). The tech savvy people who actually read the smart contract (kudos to you!) could notice some interesting logic inside it, namely a custom hybrid locking mechanism.

## Custom hybrid locks

QANX tokens can be locked by specifying a **HardLock** date and a **SoftLock** date.
HardLock means that the account owner can not move a single token until this date.

Between the HardLock and SoftLock date the tokens are made accessible gradually.

This ensures that meaningful strategies can be mapped out to protect the market.

## No intermediaries, direct account access

On the current DeFi market ERC20 tokens are mostly locked in external smart contracts, which means that the users do not own them directly on their accounts.

We see that most people love to see their tokens and balances directly on Etherscan / BSCscan / MetaMask / etc.

With our custom hybrid locking mechanism token holders are able to see their own personal final balances, not just hoping that a smart contract would eventually release their funds to them later.

## Open source approach

In addition to the previous point, many currently mainstream locking smart contracts are not open source. They could have a self-destruct equivalent method lurking around in them burning all the tokens they hold, or a secret backdoor transfer to allow someone to withdraw everything and no-one would know. Our contract is fully open-source, verified on both [Etherscan](https://etherscan.io/address/0xAAA7A10a8ee237ea61E8AC46C50A8Db8bCC1baaa#code) and [BSCscan](https://bscscan.com/address/0xAAA7A10a8ee237ea61E8AC46C50A8Db8bCC1baaa#code), and audited by the leading smart contract auditor [CertiK](https://www.certik.org/projects/qanx).
No surprises with QANX ever, guaranteed.

## Further transferability of locked tokens: Allowed Hops

While accomplishing all the above goals, business demands that custom agreements can be also fulfilled. This means that a resellers / launchpads / VCs should be able to purchase locked tokens, but also should be able to sell them further. Also it was extremely high priority for us that the final recipients are able to hold their tokens themselves on their accounts and they are not required to trust anyone to transfer their purchased tokens later.
The most important factor here is to make sure that no-one in such a transaction-pipeline is able to dump tokens on the market crashing other people's interests.

So our custom ```transferLocked()``` method has an option to define how many times the locked tokens can be transferred further.
This ensures that this logic fully INCOMPATIBLE with all Centralized and Decentralized Exchanges, so the locked funds can only moved between regular accounts only.

## HardLocks and SoftLocks: Gradual release

When an account is holding locked tokens two important dates are defined:
The HardLock specifies the date until when the locked tokens can not be freed at all.

The SoftLock defines that between the HardLock date and SoftLock date the tokens can be freed gradually.

---

### EXAMPLE: A Buyer's journey

A buyer purchases 100,000 locked tokens on 2021-12-01 with the following lock parameters:
- HardLock until 2021-12-14
- SoftLock until 2021-12-24
- AllowedHops: 0

The buyer can not free access any tokens until 2021-12-14. He can not even transfer the locked tokens further as the AllowedHops was defined as 0.
From the date of 2021-12-14 until 2021-12-24 the buyer can gradually unlock their own balance, according to this example 10,000 tokens each day.
They can call the ```unlock()``` method on their own account and the proportional amount will be migrated from their lockedBalance to their regular ERC20 compliant balance, which can be traded and transferred just like any ERC20 token.

---

### EXAMPLE: A Reseller's journey

A reseller purchases 1,000,000 locked tokens on 2022-01-01 with the following lock parameters:
- HardLock until 2022-06-01
- SoftLock until 2022-12-01
- AllowedHops: 1

The reseller is permitted to transfer the locked tokens further to their buyers with the following parameters:
- HardLock until 2022-06-01
- SoftLock until 2022-12-01
- AllowedHops: 0

This means that their buyers can not transfer the tokens further as with each ```transferLocked()``` method call the AllowedHops parameter has to be decreased by at least 1, otherwise the transfer call is rejected.
The reseller could extend both the HardLock and SoftLock if they wanted to, but not shorten it. Stricter locking params can always be applied, but less strict ones can not. This ensures that the system can not be exploited.


