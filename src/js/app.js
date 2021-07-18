App = {
    contracts: {}, // Store contract abstractions
    web3Provider: null, // Web3 provider
    url: 'http://localhost:8545', // Url for web3
    account: '0x0', // current ethereum account
    init: function () { return App.initWeb3(); },

    initWeb3: function () {
        if (typeof web3 != 'undefined') { // Check whether exists a provider, e.g Metamask
            App.web3Provider = window.ethereum; // standard since 2/11/18
            web3 = new Web3(App.web3Provider);
            try { // Permission popup
                ethereum.enable().then(async () => { console.log("DApp connected"); });
            }
            catch (error) { console.log(error); }
        } else { // Otherwise, create a new local instance of Web3
            App.web3Provider = new Web3.providers.HttpProvider(App.url); // <==
            web3 = new Web3(App.web3Provider);
        }
        return App.initContract();
    },

    initContract: function () {
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
    },

    listenForEvents: function () {
        App.contracts["Mayor"].deployed().then(async (instance) => {
            console.log(await instance.escrow());
            console.log(await instance.candidates(0));
            console.log(await instance.candidates(1));
            console.log(await instance.candidates(2));
        });
        App.contracts["Mayor"].deployed().then(async (instance) => {
            // click is the Solidity event
            instance.click().on('data', function (event) {
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
            const v = await instance.value();
            console.log(v);
            $("#valueId").html("" + v);
        });
    },

    pressClick: function () {
        App.contracts["Contract"].deployed().then(async (instance) => {
            await instance.pressClick({ from: App.account });
        });
    }

}



// Call init whenever the window loads
$(function () {
    $(window).on('load', function () {
        debugger;
        App.init();
    });
});