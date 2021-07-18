App = {
    contracts: {}, // Store contract abstractions
    web3Provider: null, // Web3 provider
    url: 'http://localhost:8545', // Url for web3
    account: '0x0', // current ethereum account
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
                console.log(account);
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
            // console.log(await instance.candidates(0));
            // console.log(await instance.candidates(1));
            // console.log(await instance.candidates(2));

            console.log(escrow);
            $("#valueId").text(escrow);
            $('#escrows').removeAttr('disabled');
        });
        return App.depositSoul();
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
                console.log(counter);
            };
        });
    },

    pressClick: function () {
        App.contracts["Contract"].deployed().then(async (instance) => {
            await instance.pressClick({ from: App.account });
        });
    },

}



// // Call init whenever the window loads
// $(function () {
//     $(window).on('load', function () {
//         debugger;
//         App.init();
//     });
// });