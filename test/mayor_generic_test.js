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
            await _instance.cast_envelope(envelope, { from: accounts[i] });
        }

        let tx = await _instance.open_envelope(1, accounts[0], { from: accounts[3], value: 1 });
        truffleAssert.eventEmitted(tx, 'EnvelopeOpen', (ev) => {
            return (ev._voter === accounts[3] && ev._symbol == accounts[0]);
        });


    });

    it("Should emit NewMayor event", async () => {

        _instance = await Mayor.new([accounts[0], accounts[1]], accounts[2], 3, { from: accounts[0] });

        _instance.deposit_soul({ from: accounts[0], value: 100 });
        _instance.deposit_soul({ from: accounts[1], value: 100 });

        for (i = 3; i < 6; i++) {
            let envelope = await _instance.compute_envelope(1, accounts[0], 1, { from: accounts[i] });
            await _instance.cast_envelope(envelope, { from: accounts[i] });
        }

        for (i = 3; i < 6; i++) {
            await _instance.open_envelope(1, accounts[0], { from: accounts[i], value: 1 });
        }

        // let's wait for the transaction, then test the event
        let tx = await _instance.mayor_or_sayonara({ from: accounts[0] });
        // assert winner === accounts[0]
        truffleAssert.eventEmitted(tx, 'NewMayor', (ev) => {
            return ev._candidate === accounts[0];
        });

    });

    it("Should refund losing voter", async () => {

        _instance = await Mayor.new([accounts[0], accounts[1]], accounts[2], 2, { from: accounts[0] });

        _instance.deposit_soul({ from: accounts[0], value: 100 });
        _instance.deposit_soul({ from: accounts[1], value: 100 });

        // first vote (bigger)
        let envelope1 = await _instance.compute_envelope(1, accounts[0], 10, { from: accounts[3] });
        await _instance.cast_envelope(envelope1, { from: accounts[3] });

        // second vote (smaller) -> this guy is the loser and gets refunded
        let envelope2 = await _instance.compute_envelope(1, accounts[1], 1, { from: accounts[3] });
        await _instance.cast_envelope(envelope2, { from: accounts[4] });

        await _instance.open_envelope(1, accounts[0], { from: accounts[3], value: 10 });
        await _instance.open_envelope(1, accounts[1], { from: accounts[4], value: 1 });


        // let's wait for the transaction, then test the event
        let tx = await _instance.mayor_or_sayonara({ from: accounts[0] });

        // accounts[4] should be refunded!
        truffleAssert.eventEmitted(tx, 'RefundedVoter', (ev) => {
            return (ev._voter == accounts[4] && ev._soul == 1);
        });

    });

    it("Should reward winning voters", async () => {

        _instance = await Mayor.new([accounts[0], accounts[1]], accounts[2], 3, { from: accounts[0] });

        _instance.deposit_soul({ from: accounts[0], value: 100 });
        _instance.deposit_soul({ from: accounts[1], value: 100 });

        for (i = 0; i < 3; i++) {
            let envelope = await _instance.compute_envelope(1, accounts[0], 1, { from: accounts[i + 3] });
            _instance.cast_envelope(envelope, { from: accounts[i + 3] });
        }

        for (i = 0; i < 3; i++) {
            await _instance.open_envelope(1, accounts[0], { from: accounts[i + 3], value: 1 });
        }

        // let's wait for the transaction, then test the event
        let tx = await _instance.mayor_or_sayonara({ from: accounts[0] });

        // accounts 3 to 5 should be rewarded with 33 weis each
        for (i = 0; i < 3; i++) {
            truffleAssert.eventEmitted(tx, 'RewardVoter', (ev) => {
                return (ev._voter == accounts[i + 3] && ev._soul == 33);
            });
        }

    });

    it("Should emit Tie event", async () => {

        _instance = await Mayor.new([accounts[0], accounts[1]], accounts[2], 2, { from: accounts[0] });

        _instance.deposit_soul({ from: accounts[0], value: 100 });
        _instance.deposit_soul({ from: accounts[1], value: 100 });

        for (i = 0; i < 2; i++) {
            let envelope = await _instance.compute_envelope(1, accounts[i], 1, { from: accounts[i + 2] });
            _instance.cast_envelope(envelope, { from: accounts[i + 2] });
        }

        for (i = 0; i < 2; i++) {
            await _instance.open_envelope(1, accounts[i], { from: accounts[i + 2], value: 1 });
        }

        // let's wait for the transaction, then test the event
        let tx = await _instance.mayor_or_sayonara({ from: accounts[0] });

        truffleAssert.eventEmitted(tx, 'Tie', (ev) => {
            // not great, but it works. Thank js for crappy equality!
            return JSON.stringify([accounts[0], accounts[1]]) == JSON.stringify(ev._tiers);
        });

    });

    it("Should correctly transfer all the money to the escrow in case of a tie", async () => {

        _instance = await Mayor.new([accounts[0], accounts[1]], accounts[2], 2, { from: accounts[0] });

        _instance.deposit_soul({ from: accounts[0], value: 100 });
        _instance.deposit_soul({ from: accounts[1], value: 100 });

        for (i = 0; i < 2; i++) {
            let envelope = await _instance.compute_envelope(1, accounts[i], 1, { from: accounts[i + 2] });
            _instance.cast_envelope(envelope, { from: accounts[i + 2] });
        }

        for (i = 0; i < 2; i++) {
            await _instance.open_envelope(1, accounts[i], { from: accounts[i + 2], value: 1 });
        }

        // let's wait for the transaction, then test the event
        let tx = await _instance.mayor_or_sayonara({ from: accounts[0] });

        truffleAssert.eventEmitted(tx, 'EscrowTransfer', (ev) => {
            // 202 -> two votes and two deposits
            return ev._transfer == 202;
        });

    });
})
