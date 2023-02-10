FROM node:18.14.0-alpine3.17

WORKDIR /src
COPY . .
RUN npm install && \
    ln -s /src/artifacts/contracts /out && \
    npx hardhat compile

ENTRYPOINT [ "npx", "hardhat" ]
CMD [ "test" ]
