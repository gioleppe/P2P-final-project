const Mayor = artifacts.require("Mayor");
const ethers = require("ethers");

// to store the contract's instance
instance = null;

contract("Mayor, generic tests gas estimate", async accounts => {
    it("Should test the constructor", async () => {
        instance = await Mayor.new(accounts[0], accounts[1], 1, {from: accounts[0]})

        return instance.candidate()
        .then(addr => {
            assert.equal(addr, accounts[0])
        })
        
    });

    it("Should estimate gas for compute_envelope", async () => {
        // precompute the envelope
        let _envelope = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(["uint", "bool", "uint"], [1, true, 1]));

        gas = await instance.compute_envelope.estimateGas(1, true, 1, {from: accounts[2]});
        console.log("Gas estimate (compute_envelope): ", gas, " Gas Units");
    });

    it("Should estimate gas for cast_envelope", async () => {
        let envelope = await instance.compute_envelope(1, true, 1, {from: accounts[2]});

        // console.log(envelope);
        gas = await instance.cast_envelope.estimateGas(envelope, {from: accounts[2]}); 
        console.log("Gas estimate (cast_envelope): ", gas, " Gas Units");
        
        // actually sending out the transaction for usage in further steps
        return instance.cast_envelope(envelope, {from: accounts[2]}); 
        
    });

    it("Should estimate gas for open envelopes", async () => {
        gas = await instance.open_envelope.estimateGas(1, true, {from: accounts[2], value: 1});   
        console.log("Gas estimate (open_envelope): ", gas, " Gas Units");  
        
        // actually sending out the transaction for usage in further steps
        return instance.open_envelope(1, true, {from: accounts[2], value: 1}); 
    });

    it("Should correctly declare the winner", async() => {
        gas = await instance.mayor_or_sayonara.estimateGas({from: accounts[0]});
        console.log("Gas estimate (mayor_or_sayonara): ", gas, " Gas Units");     
    });

})
