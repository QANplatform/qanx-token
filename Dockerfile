FROM pmjohann/truffle:v5.3.0

# DEFINE OPENZEPPELIN ERC20 IMPLEMENTATION VERSION AND REPO URL
ARG OZ_ERC20=v4.0.0
ENV OZ_REPO="https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/$OZ_ERC20/"

# COPY SOURCES
COPY . .

# DOWNLOAD OFFICIAL OPENZEPPELIN IMPLEMENTATIONS TO BE EXTENDED
RUN wget -O- "$OZ_REPO/contracts/token/ERC20/IERC20.sol" >> /tmp/erc20.sol && \
    wget -O- "$OZ_REPO/contracts/utils/Context.sol"      >> /tmp/erc20.sol && \
    wget -O- "$OZ_REPO/contracts/access/Ownable.sol"     >> /tmp/erc20.sol && \
    wget -O- "$OZ_REPO/contracts/token/ERC20/ERC20.sol"  >> /tmp/erc20.sol

# ALL THE REQUIRED SOLIDITY FILES WERE CONCATENATED, DELETE UNNECESSARY LINES
RUN sed -i '/SPDX-License-Identifier/d' /tmp/erc20.sol && \
    sed -i '/pragma solidity/d'         /tmp/erc20.sol && \
    sed -i '/import/d'                  /tmp/erc20.sol

# PREPEND A SINGLE SOLIDITY VERSION AND LICENCE TO THE CONTRACT FOR PROPER SYNTAX
RUN sed -i '1s;^;pragma solidity ^0.8.0\;;'          /tmp/erc20.sol && \
    sed -i '1s;^;// SPDX-License-Identifier: MIT\n;' /tmp/erc20.sol

# MAKE OPENZEPPELIN ERC20 CONTRACT ABSTRACT
RUN sed -i 's/contract ERC20/abstract contract ERC20/' /tmp/erc20.sol

# MAKE THE _balances PROPERTY ACCESSIBLE TO INHERITING CONTRACT
RUN sed -i 's/private _balances/internal _balances/' /tmp/erc20.sol

# APPEND QANX.sol CONTRACT TO THE OPENZEPPELIN ORIGINAL
RUN cat contracts/QANX.sol >> /tmp/erc20.sol && \
    cat /tmp/erc20.sol > contracts/QANX.sol

