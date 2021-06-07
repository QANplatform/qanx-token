const DistributeQANX = artifacts.require("DistributeQANX");

module.exports = function (deployer) {
  deployer.deploy(DistributeQANX, '0x345cA3e014Aaf5dcA488057592ee47305D9B3e10');
};
