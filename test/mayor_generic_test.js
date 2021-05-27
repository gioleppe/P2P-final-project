const Mayor = artifacts.require("Mayor");
const ethers = require("ethers");

// to store the contract's instance
instance = null;

contract("Mayor, generic tests", async accounts => {
    it("Should test the constructor", async () => {
        instance = await Mayor.new(accounts[0], accounts[1], 1, {from: accounts[0]})

        return instance.candidate()
        .then(addr => {
            assert.equal(addr, accounts[0])
        })
        
    });

    it("Should correctly compute envelopes", () => {
        // precompute the envelope
        let _envelope = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(["uint", "bool", "uint"], [1, true, 1]));

        // check if returned envelope is the same as the one we computed before
        return instance.compute_envelope(1, true, 1, {from: accounts[2]})
        .then(envelope => assert.equal(envelope, _envelope));
    });

    it("Should correctly cast envelopes", async () => {
        let envelope = await instance.compute_envelope(1, true, 1, {from: accounts[2]});

        // console.log(envelope);
        
        return instance.cast_envelope(envelope, {from: accounts[2]});

    });

    it("Should correctly open envelopes", async () => {
        return instance.open_envelope(1, true, {from: accounts[2], value: 1})        
    });

    it("Should correctly declare the winner", async() => {
        return instance.mayor_or_sayonara({from: accounts[0]});
    });

})
