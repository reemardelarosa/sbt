const Web3 = require('web3')
const Web3js = new Web3(new Web3.providers.HttpProvider("https://{username}:{password}@bisontrailsURL"))
const privateKey = process.env.YOUR_PRIVATE_KEY //Your Private key environment variable
let tokenAddress = '0x4134aa5373acafc36337bf515713a943927b06e5' // Demo Token contract address
let toAddress = '' // where to send it
let fromAddress = '' // your wallet
let contractABI = [
    // transfer
    {
        'constant': false,
        'inputs': [{
                'name': '_to',
                'type': 'address'
            },
            {
                'name': '_value',
                'type': 'uint256'
            }
        ],
        'name': 'transfer',
        'outputs': [{
            'name': '',
            'type': 'bool'
        }],
        'type': 'function'
    }
]
let contract = new Web3js.eth.Contract(contractABI, tokenAddress, {
    from: fromAddress
})
let amount = Web3js.utils.toHex(Web3js.utils.toWei("1")); //1 DEMO Token
let data = contract.methods.transfer(toAddress, amount).encodeABI()
sendErcToken()

function sendErcToken() {
    let txObj = {
        gas: Web3js.utils.toHex(100000),
        "to": tokenAddress,
        "value": "0x00",
        "data": data,
        "from": fromAddress
    }
    Web3js.eth.accounts.signTransaction(txObj, privateKey, (err, signedTx) => {
        if (err) {
            return callback(err)
        } else {
            console.log(signedTx)
            return Web3js.eth.sendSignedTransaction(signedTx.rawTransaction, (err, res) => {
                if (err) {
                    console.log(err)
                } else {
                    console.log(res)
                }
            })
        }
    })
}