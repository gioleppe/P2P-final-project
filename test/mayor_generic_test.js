const Mayor = artifacts.require("Mayor");
const ethers = require("ethers");
const truffleAssert = require('truffle-assertions');

// to store the contract's instance
instance = null;

contract("Mayor, generic tests", async accounts => {
    it("Should test the constructor", async () => {
        // account 0 creates a new election with three candidates, a quorum of 4
        instance = await Mayor.new([accounts[0], accounts[1], accounts[2]], accounts[3], 4, { from: accounts[0] });
        return (instance == true);

    });

    it("Should fail if the contract is deployed with a single candidate", async () => {
        await truffleAssert.fails(
            Mayor.new([accounts[0]], accounts[3], 4, { from: accounts[0] }),
        );
    });

    it("Should let candidates deposit soul", async () => {

        let counter = 0;
        for (i = 0; i < 3; i++) {
            // if we successfully deposit some soul
            deposit = await instance.deposit_soul({ from: accounts[i], value: 100 });
            if (deposit)
                counter += 1;
        }

        return (counter == 3);

    });

    it("Should fail when double depositing", async () => {
        // another instance just for this test
        _instance = await Mayor.new([accounts[0], accounts[1]], accounts[2], 3, { from: accounts[0] })
        // this will go smoothly
        deposit = await _instance.deposit_soul({ from: accounts[0], value: 100 });
        // this will fail
        await truffleAssert.fails(
            _instance.deposit_soul({ from: accounts[0], value: 100 }),
        );

    });

    it("Should fail when the deposit doesn't come from a candidate", async () => {
        // another instance just for this test
        _instance = await Mayor.new([accounts[0], accounts[1]], accounts[2], 3, { from: accounts[0] })

        // this will fail
        await truffleAssert.fails(
            _instance.deposit_soul({ from: accounts[9], value: 100 }),
        );

    });

    it("Should compute envelope", () => {

        // precompute the envelope
        let _envelope = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(["uint", "address", "uint"], [1, accounts[0], 1]));
        // check if returned envelope is the same as the one we computed before
        return instance.compute_envelope(1, accounts[0], 1, { from: accounts[2] })
            .then(envelope => assert.equal(envelope, _envelope));

    });

    it("Should cast envelope", async () => {
        // another instance just for this test
        _instance = await Mayor.new([accounts[0], accounts[1]], accounts[2], 3, { from: accounts[0] });

        _instance.deposit_soul({ from: accounts[0], value: 100 });
        _instance.deposit_soul({ from: accounts[1], value: 100 });

        let envelope = await _instance.compute_envelope(1, accounts[0], 1, { from: accounts[9] });
        return _instance.cast_envelope(envelope, { from: accounts[9] });

    });

    it("Should fail when casting a vote without waiting for all deposits", async () => {
        // another instance just for this test
        _instance = await Mayor.new([accounts[0], accounts[1]], accounts[2], 3, { from: accounts[0] })

        // this will fail
        let envelope = await instance.compute_envelope(1, accounts[0], 1, { from: accounts[9] });
        await truffleAssert.fails(
            _instance.cast_envelope(envelope, { from: accounts[9], value: 1 }),
        );

    });

    it("Should correctly open an envelope", async () => {
        // another instance just for this test
        _instance = await Mayor.new([accounts[0], accounts[1]], accounts[2], 3, { from: accounts[0] });

        _instance.deposit_soul({ from: accounts[0], value: 100 });
        _instance.deposit_soul({ from: accounts[1], value: 100 });

        for (i = 3; i < 6; i++) {
            let envelope = await _instance.compute_envelope(1, accounts[0], 1, { from: accounts[i] });
            _instance.cast_envelope(envelope, { from: accounts[i] });
        }

        let tx = await _instance.open_envelope(1, accounts[0], { from: accounts[3], value: 1 });
        truffleAssert.eventEmitted(tx, 'EnvelopeOpen', (ev) => {
            return (ev._voter === accounts[3] && ev._symbol == accounts[0]);
        });


    });

    it("Should emit new mayor event", async () => {

        _instance = await Mayor.new([accounts[0], accounts[1]], accounts[2], 3, { from: accounts[0] });

        _instance.deposit_soul({ from: accounts[0], value: 100 });
        _instance.deposit_soul({ from: accounts[1], value: 100 });

        for (i = 3; i < 6; i++) {
            let envelope = await _instance.compute_envelope(1, accounts[0], 1, { from: accounts[i] });
            _instance.cast_envelope(envelope, { from: accounts[i] });
        }

        for (i = 3; i < 6; i++) {
            await _instance.open_envelope(1, accounts[0], { from: accounts[i], value: 1 });
        }

        // let's wait for the transaction, then test the event
        let tx = await _instance.mayor_or_sayonara({ from: accounts[0] });
        console.log(tx);
        // assert winner == accounts[0]
        truffleAssert.eventEmitted(tx, 'NewMayor', (ev) => {
            return ev._candidate === accounts[0];
        });

    });

})
