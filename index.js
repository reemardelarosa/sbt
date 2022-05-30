const Web3 = require('web3');
const Buffer = require('buffer/').Buffer // note: the trailing slash is important!
const Tx = require('ethereumjs-tx').Transaction;
const Common = require('ethereumjs-common').default;
const bufferToHex = require('ethereumjs-util').bufferToHex;
const privateToAddress = require('ethereumjs-util').privateToAddress;

/*** SET THESE VARIABLES ***/
const sbtContractAddress = "0x4946583c5b86e01ccd30c71a05617d06e3e73060"; // Update with the address of your smart contract
const contractAbi = "./sbtABI.json"; // Update with an ABI file
const web3 = new Web3(Web3.givenProvider || `http://proxy.sunblockterminal.com:7664`);
const senderAddress = "0xf96f4F26188670a0730d5F65570b6589469c8301";
const destAddress = "0xEED15870f5Bd6720C9bC3289981b885D1e0981D7";
/*** Global scope variables that will be automatically assigned values later on ***/
let infoSpace; // This is an <ul> element where we will print out all the info
let minABI;
let contract; // Contract instance
let account; // Your account as will be reported by Metamask
let transferAmount;

/*** Initialize when page loads ***/
window.addEventListener("load", () => {
  // Shortcut to interact with HTML elements
  infoSpace = document.querySelector(".info");

  // sending using metamask
  document.querySelector(".start").addEventListener("click", async () => {
    if (sbtContractAddress === "" || contractAbi === "") {
      printResult(
        `Make sure to set the variables <code>contractAddress</code> and <code>contractAbi</code> in <code>./index.js</code> first. Check out <code>README.md</code> for more info.`
      );
      return;
    }

    if (typeof ethereum === "undefined") {
      printResult(
        `Metamask not connected. Make sure you have the Metamask plugin, you are logged in to your MetaMask account, and you are using a server or a localhost (simply opening the html in a browser won't work).`
      );
      return;
    }
    console.log(`web3 version: ${web3.version}`);

    // Determine  the nonce
    const count = await web3.eth.getTransactionCount(senderAddress);
    console.log(`num transactions so far: ${count}`);

    await connectWallet();
    await connectContract(contractAbi, sbtContractAddress);
    await getBalance(account);
    transferAmount = 0.01 * Math.pow(10, 18);
    transferAmount = "0x" + transferAmount.toString(16)
    listenToTransferEvent(account, destAddress, transferAmount); // Not an async function
    await transfer(destAddress, transferAmount);
  });

  // sending using web3.eth.sendSignedTransaction
  document.querySelector(".raw").addEventListener("click", async () => {
    minABI = [
      // transfer
      {
        "constant": false,
        "inputs": [{
            "name": "_to",
            "type": "address"
          },
          {
            "name": "_value",
            "type": "uint256"
          }
        ],
        "name": "transfer",
        "outputs": [{
          "name": "success",
          "type": "bool"
        }],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
      }
    ];
    console.log(`web3 version: ${web3.version}`);

    // Determine  the nonce
    const count = await web3.eth.getTransactionCount(senderAddress);
    console.log(`num transactions so far: ${count}`);

    transferAmount = 0.01 * Math.pow(10, 18); // 0.01 SBT, 18 decimals
    console.log("transferAmount", transferAmount);
    const rawTransaction = {
      "from": senderAddress,
      "nonce": "0x" + count.toString(16),
      "gasPrice": "0x003B9ACA00",
      "gasLimit": "0x250CA",
      "value": "0x" + transferAmount.toString(16), 
      "to": destAddress,
      "chainId": 5769
    };

    const privKey = new Buffer('0bebd15d29eafcc975266d29d906b9dbe7448df609d097be8c1bb7d1ab98bca1', 'hex');
    const SBT_MAIN = Common.forCustomChain(
      'mainnet', {
        name: 'sbt',
        networkId: 5769,
        chainId: 5769
      },
      'petersburg'
    )

    const tx = new Tx(rawTransaction, {
      common: SBT_MAIN
    });
    tx.sign(privKey);
    const serializedTx = tx.serialize();

    // Comment out these three lines if you don't really want to send the TX right now
    console.log(`Attempting to send signed tx: ${serializedTx.toString('hex')}`);
    if (
      tx.validate() &&
      bufferToHex(tx.getSenderAddress()) === bufferToHex(privateToAddress(privKey))
    ) {
      console.log('Valid signature')
    } else {
      console.log('Invalid signature')
    }
    
    console.log("The transaction's chain id is", tx.getChainId())
    const receipt = await web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'));
    console.log(`Receipt info: ${JSON.stringify(receipt, null, '\t')}`);
    await connectWallet();
    await connectContract(contractAbi, sbtContractAddress);
    await getBalance(account);
  });
});

/*** Functions ***/

// Helper function to print results
const printResult = (text) => {
  infoSpace.innerHTML += `<li>${text}</li>`;
};

// Helper function to display readable address
const readableAddress = (address) => {
  return `${address.slice(0, 5)}...${address.slice(address.length - 4)}`;
};

// Helper function to get JSON (in order to read ABI in our case)
const getJson = async (path) => {
  const response = await fetch(path);
  const data = await response.json();
  return data;
};

// Connect to the MetaMask wallet
const connectWallet = async () => {
  const accounts = await ethereum.request({
    method: "eth_requestAccounts"
  });
  account = accounts[0];
  printResult(`Connected account: ${readableAddress(account)}`);
};

// Connect to the contract
const connectContract = async (contractAbi, contractAddress) => {
  const data = await getJson(contractAbi);
  const contractABI = data.abi;
  contract = new web3.eth.Contract(contractABI, contractAddress);
};

// Example of a web3 method
const getBalance = async (address) => {
  // printResult(`getBalance() requested.`);
  const balance = await web3.eth.getBalance(address);
  printResult(`Account ${readableAddress(account)} has ${web3.utils.fromWei(balance)} SBT`);
};

// Example of using call() on a contract's method that doesn't require gas
const balanceOf = async (account) => {
  // printResult(`balanceOf() called.`);
  try {
    const balance = await contract.methods.balanceOf(account).call();
    printResult(`Account ${readableAddress(account)} has ${web3.utils.fromWei(balance)} SBT.`);
  } catch (error) {
    printResult(`Error: ${error.message}`);
  }
};

// Example of using send() on a contract's method that requires gas
const transfer = async (to, amount) => {
  printResult(`transfer() sent.`);
  try {
    const result = await contract.methods.transfer(to, amount).send({
      from: account,
      value: "0x0",
      data: contract.methods.transfer(destAddress, transferAmount).encodeABI(),
    });
    printResult(`Result: ${result.status}`);
  } catch (error) {
    printResult(`Error: ${error.message}`);
  }
};

// Example of subscribing to an Event
const listenToTransferEvent = (account, otherAccount, transferAmount) => {
  contract.events
    .Transfer(account, otherAccount, transferAmount)
    .on("data", console.log)
    .on("error", console.error);
};
