const Mayor = artifacts.require("Mayor");
const ethers = require("ethers");

// to store the contract's instance
instance = null;

contract("Mayor, generic tests", async accounts => {
    it("Should test the constructor", async () => {
        // account 0 creates a new election with three candidates, a quorum of 4
        instance = await Mayor.new([accounts[0], accounts[1], accounts[2]], accounts[3], 4, {from: accounts[0]});
        return (instance == true);
        
    });

    it("Should test soul depositing from the candidates", async () => {
        
        let counter = 0;
        for (i = 0; i < 3; i++){
            // if we successfully deposit some soul
           deposit = await instance.deposit_soul({from: accounts[i], value: 100});
           if (deposit)
            counter += 1;
        }

        return (counter == 3);

    });

    it("Should test failure when double depositing", async () => {
        // another instance just for this test
        _instance = await Mayor.new([accounts[0], accounts[1]], accounts[2], 3, {from: accounts[0]})
        // this will go smoothly
        deposit = await _instance.deposit_soul({from: accounts[0], value: 100});
        // this will fail
        expect(_instance.deposit_soul({from: accounts[0], value: 100})).to.throw(Error);

    });

    it("Should test compute envelope", () => {

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
