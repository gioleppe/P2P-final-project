App = {
    contracts: {}, // Store contract abstractions
    web3Provider: null, // Web3 provider
    url: 'http://localhost:8545', // Url for web3
    //account: '0x0', // current ethereum account
    accounts: null,
    init: function () { return App.initWeb3(); },

    initWeb3: function () {
        // if (typeof web3 != 'undefined') { // Check whether exists a provider, e.g Metamask
        //     App.web3Provider = window.ethereum; // standard since 2/11/18
        //     web3 = new Web3(App.web3Provider);
        //     try { // Permission popup
        //         ethereum.enable().then(async () => { console.log("DApp connected"); });
        //     }
        //     catch (error) { console.log(error); }
        // } else { // Otherwise, create a new local instance of Web3
        App.web3Provider = new Web3.providers.HttpProvider(App.url); // <==
        web3 = new Web3(App.web3Provider);
        // }
        return App.initContract();
    },

    initContract: async function () {
        // Store ETH current account
        web3.eth.getCoinbase(function (err, account) {
            if (err == null) {
                App.account = account;
                // console.log(account);
                $("#accountId").html("Your address: " + account);
            }
        });
        // Init contracts
        $.getJSON("Mayor.json").done(function (c) {
            App.contracts["Mayor"] = TruffleContract(c);
            App.contracts["Mayor"].setProvider(App.web3Provider);
            return App.listenForEvents();
        });
        // get the accounts from web3
        App.accounts = await web3.eth.getAccounts();
        console.log(App.accounts);
    },

    listenForEvents: function () {
        App.contracts["Mayor"].deployed().then(async (instance) => {
            // click is the Solidity event
            instance.VoteForMe().on('data', function (event) {
                $("#eventId").html("Event catched!");
                console.log("Event catched");
                console.log(event);
                // If event has parameters: event.returnValues.*paramName*
            });
        });
        return App.render();
    },

    render: function () {
        // Retrieve contract instance
        App.contracts["Mayor"].deployed().then(async (instance) => {
            // Call the value function (value is a public attribute)
            const escrow = await instance.escrow();

            alert("The voting has begun! The escrow is at address:" + escrow);
            // console.log(escrow);
            $("#valueId").text(escrow);
            // enable candidate deposit
            $('#escrows').removeAttr('disabled');
            // disable begin button
            $('#begin').attr('disabled', 'disabled');
        });
    },

    depositSoul: function () {
        App.contracts["Mayor"].deployed().then(async (instance) => {
            counter = 0;
            // accounts 1, 2, and 3 are the candidates
            for (i = 1; i < 4; i++) {
                // if we successfully deposit some soul
                deposit = await instance.deposit_soul({ from: App.accounts[i], value: 100 });
                if (deposit)
                    counter += 1;
            };
            alert("All candidates deposited their soul!")
            // disable candidate deposit button
            $('#escrows').attr('disabled', 'disabled');
            // enable voting button
            $('#voting').removeAttr('disabled');
        });
    },

    vote: function () {
        App.contracts["Mayor"].deployed().then(async (instance) => {
            for (i = 4; i < 7; i++) {
                let envelope = await instance.compute_envelope(1, App.accounts[1], 1, { from: App.accounts[i] });
                // console.log(envelope);
                await instance.cast_envelope(envelope, { from: App.accounts[i] });
            }
            alert("All voters cast their envelopes!")
            // disable voting button
            $('#voting').attr('disabled', 'disabled');
            // enable mayor declaration button
            $('#sayonara').removeAttr('disabled');
        });
    },

    declareWinner: async function () {
        App.contracts["Mayor"].deployed().then(async (instance) => {
            // open envelopes
            for (i = 4; i < 7; i++) {
                await instance.open_envelope(1, App.accounts[1], { from: App.accounts[i], value: 1 });
            }
            await instance.mayor_or_sayonara({ from: App.accounts[0] })
            winning_event = await instance.getPastEvents('NewMayor');
            winner_address = winning_event[0]["returnValues"]["_candidate"];
            alert("The voting has ended! The winner is: " + winner_address);
            // disable mayor declaration button
            $('#sayonara').attr('disabled', 'disabled');
        });
    }

}



// // Call init whenever the window loads
// $(function () {
//     $(window).on('load', function () {
//         debugger;
//         App.init();
//     });
// });