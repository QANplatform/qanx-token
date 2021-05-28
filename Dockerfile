FROM pmjohann/truffle:v5.3.0

# DEFINE OPENZEPPELIN ERC20 IMPLEMENTATION VERSION AND REPO URL
ARG OZ_ERC20=v4.0.0
ENV OZ_REPO="https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/$OZ_ERC20/"

# COPY SOURCES
COPY . .

# DOWNLOAD OFFICIAL OPENZEPPELIN IMPLEMENTATIONS TO BE EXTENDED
RUN wget -O- "$OZ_REPO/contracts/token/ERC20/IERC20.sol" >> /tmp/erc20.sol && \
    wget -O- "$OZ_REPO/contracts/utils/Context.sol"      >> /tmp/erc20.sol && \
    wget -O- "$OZ_REPO/contracts/token/ERC20/ERC20.sol"  >> /tmp/erc20.sol

# ALL THE REQUIRED SOLIDITY FILES WERE CONCATENATED, DELETE UNNECESSARY LINES
RUN sed -i '/SPDX-License-Identifier/d' /tmp/erc20.sol && \
    sed -i '/pragma solidity/d'         /tmp/erc20.sol && \
    sed -i '/import/d'                  /tmp/erc20.sol

# PREPEND A SINGLE SOLIDITY VERSION AND LICENCE TO THE CONTRACT FOR PROPER SYNTAX
RUN sed -i '1s;^;pragma solidity ^0.8.0\;;'          /tmp/erc20.sol && \
    sed -i '1s;^;// SPDX-License-Identifier: MIT\n;' /tmp/erc20.sol

# MAKE THE _balances PROPERTY ACCESSIBLE TO INHERITING CONTRACT
RUN sed -i 's/private _balances/internal _balances/' /tmp/erc20.sol

# PATCH FUNCTION VISIBILITIES FROM "public" TO "external" WHICH ARE NOT CALLED FROM INSIDE THE CONTRACT
RUN sed -i 's/function name() public/function name() external/' /tmp/erc20.sol && \
    sed -i 's/function symbol() public/function symbol() external/' /tmp/erc20.sol && \
    sed -i 's/function decimals() public/function decimals() external/' /tmp/erc20.sol && \
    sed -i 's/function totalSupply() public/function totalSupply() external/' /tmp/erc20.sol && \
    sed -i 's/function balanceOf(address account) public/function balanceOf(address account) external/' /tmp/erc20.sol && \
    sed -i 's/function transfer(address recipient, uint256 amount) public/function transfer(address recipient, uint256 amount) external/' /tmp/erc20.sol && \
    sed -i 's/function allowance(address owner, address spender) public/function allowance(address owner, address spender) external/' /tmp/erc20.sol && \
    sed -i 's/function approve(address spender, uint256 amount) public/function approve(address spender, uint256 amount) external/' /tmp/erc20.sol && \
    sed -i 's/function transferFrom(address sender, address recipient, uint256 amount) public/function transferFrom(address sender, address recipient, uint256 amount) external/' /tmp/erc20.sol && \
    sed -i 's/function increaseAllowance(address spender, uint256 addedValue) public/function increaseAllowance(address spender, uint256 addedValue) external/' /tmp/erc20.sol && \
    sed -i 's/function decreaseAllowance(address spender, uint256 subtractedValue) public/function decreaseAllowance(address spender, uint256 subtractedValue) external/' /tmp/erc20.sol

# APPEND QANX.sol CONTRACT TO THE OPENZEPPELIN ORIGINAL
RUN cat contracts/QANX.sol >> /tmp/erc20.sol && \
    cat /tmp/erc20.sol > contracts/QANX.sol

