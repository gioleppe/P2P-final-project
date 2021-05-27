const Mayor = artifacts.require("Mayor");

// to store the contract's instance
instance = null;

contract("Mayor, mayor_or_sayonara variations gas estimate", async accounts => {
    it("Should estimate mayor_or_sayonara gas with a big quorum", async () => {
        instance = await Mayor.new(accounts[0], accounts[1], 8, {from: accounts[0]});

        // the first two accounts are the candidate and the escrow
        for (i = 2; i<10; i++){
            envelope = await instance.compute_envelope(1, true, 1, {from: accounts[i]});
            await instance.cast_envelope(envelope, {from: accounts[i]});
        }

        // now open the envelopes
        for (i = 2; i<10; i++){
            await instance.open_envelope(1, true, {from: accounts[i], value: 1});
        }

        // estimate the gas
        gas = await instance.mayor_or_sayonara.estimateGas({from: accounts[0]});
        console.log("Gas estimate (mayor_or_sayonara big quorum): ", gas, " Gas Units");    

    });
    
    it("Should estimate mayor_or_sayonara gas with a lot of losers", async () => {
        instance = await Mayor.new(accounts[0], accounts[1], 8, {from: accounts[0]});
        
        // the first two accounts are the candidate and the escrow
        // he's the rich guy
        envelope = await instance.compute_envelope(1, false, 100, {from: accounts[2]});
        await instance.cast_envelope(envelope, {from: accounts[2]});
        // now with the plebs
        for (i = 3; i<10; i++){
            envelope = await instance.compute_envelope(1, true, 1, {from: accounts[i]});
            await instance.cast_envelope(envelope, {from: accounts[i]});
        }
        
        //rich guy opens his envelope
        await instance.open_envelope(1, false, {from: accounts[2], value: 100});

        // plebs open the envelopes
        for (i = 3; i<10; i++){
            await instance.open_envelope(1, true, {from: accounts[i], value: 1});
        }
        
        // estimate the gas
        gas = await instance.mayor_or_sayonara.estimateGas({from: accounts[0]});
        console.log("Gas estimate (mayor_or_sayonara lots of losers): ", gas, " Gas Units");    
        
    });

    it("Should estimate mayor_or_sayonara gas with balanced votes", async () => {
        instance = await Mayor.new(accounts[0], accounts[1], 8, {from: accounts[0]});
    
        // the first two accounts are the candidate and the escrow
        for (i = 2; i<6; i++){
            envelope = await instance.compute_envelope(1, true, 1, {from: accounts[i]});
            await instance.cast_envelope(envelope, {from: accounts[i]});
        }
        // nay votes
        for (i = 6; i<10; i++){
            envelope = await instance.compute_envelope(1, false, 1, {from: accounts[i]});
            await instance.cast_envelope(envelope, {from: accounts[i]});
        }
    
        // now open the envelopes
        for (i = 2; i<6; i++){
            await instance.open_envelope(1, true, {from: accounts[i], value: 1});
        }
        for (i = 6; i<10; i++){
            await instance.open_envelope(1, false, {from: accounts[i], value: 1});
        }
    
        // estimate the gas
        gas = await instance.mayor_or_sayonara.estimateGas({from: accounts[0]});
        console.log("Gas estimate (mayor_or_sayonara balanced): ", gas, " Gas Units");    
    
    });
    
})
