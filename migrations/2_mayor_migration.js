const Mayor = artifacts.require("Mayor")
const Web3 = require("web3")

module.exports = async function (deployer) {

  const accounts = await web3.eth.getAccounts()
  // console.log(accounts)
  await deployer.deploy(Mayor, [
    accounts[1],
    accounts[2],
    accounts[3]],
    accounts[0],
    4)

};
