# QANX token

## What is QANX?

QANX token is an ERC20/BEP20 compliant token optimized for trading on Decentralized Exchanges (DEX) with customizable locking and vesting options included.

The QANX token is also prepared with a mapping designed to store Post-Quantum cryptography public key hashes, which will technically enable a direct migration from the ERC20 and BEP20 tokens to QANplatform's upcoming native mainnet units which will utilize PQ cryptography by default.

---

## Audit by CertiK <img align="right" src="./audit/certik-badge.png">

We are proud that QANX smart contract passed CertiK's audit excellently. You can find the audit report [here](./audit/REP-QANX-2021-05-28.pdf).

CertiK leads blockchain security by pioneering the use of cutting-edge Formal Verification technology on smart contracts and blockchains. Unlike traditional security audits, Formal Verification mathematically proves program correctness and hacker-resistance.

Other than QANX the audit firm CertiK was also assigned to audit the recognizable PancakeSwap, 1inch, Tether and Matic just to name a few.

---
## How to compile & test

If you are still curious about how QANX works and want to verify yourself (awesome, you always should!), you can compile and test it easily with Docker. Just run the following command:

```docker build -t qanx . && docker run --rm qanx```
