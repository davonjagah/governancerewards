const algosdk = require('algosdk')

const baseServer = "https://testnet-algorand.api.purestake.io/ps2"; //define Purestake.io server
const algod_port="";
const token = {
  "X-API-Key": "3Jxaz1Vqt51y62yGF4Ykpasc2QQZ6FjJ3YgOA93B", //Input Purestake.io Api key here
};
const algodClient=new algosdk.Algodv2(token, baseServer, algod_port);
const indexerServer='https://testnet-algorand.api.purestake.io/idx2';
const indexerClient=new algosdk.Indexer(token, indexerServer, algod_port);
const ASSET_ID=21364625;

var voters=[];
var transactions=[];
var signed=[];
var committedAmount=0;
var rewardAmount;

var rewardMmemonic='horse name glow spider seek float thumb excess express below vanish furnace shallow charge cycle orchard ketchup laugh romance hope cushion this wrong absent scene'
var secretKey=algosdk.mnemonicToSecretKey(rewardMmemonic); //Put address two Mnemonic Phrase here

console.log(secretKey);

function truncateDecimals(number, digits) {
    var multiplier = Math.pow(10, digits),
        adjustedNum = number * multiplier,
        truncatedNum = Math[adjustedNum < 0 ? 'ceil' : 'floor'](adjustedNum);

    return truncatedNum / multiplier;
};


async function getVoters(){
    const txnHistory = await indexerClient
        .searchForTransactions()
        .address('5CLFBFI33DFGZTCNTIG7FURBRC57E6JA2PI4PZC7PBGPQLXIFV4PCBVYHQ')
        .assetID(ASSET_ID)
        .addressRole("receiver")
        .txType("axfer")
        .do();

        await txnHistory.transactions.forEach((txn) => {
            const transaction = txn["asset-transfer-transaction"];
            committedAmount += transaction["amount"];
          });

      const receiverAddress=await txnHistory.transactions.map(receiver=>{
          if((receiver['asset-transfer-transaction'].amount)/100 >1){
            voters.push({
                sender:receiver.sender,
                amount:(receiver['asset-transfer-transaction'].amount)/100
            })
          } 
        })
}

async function draftTransaction(voters, ratio){
    const params = await algodClient.getTransactionParams().do(); //get transaction params
    voters.forEach((voter)=>{
            transactions.push(algosdk.makeAssetTransferTxnWithSuggestedParams(secretKey.addr, voter.sender, undefined, undefined,  (voter.amount*ratio)*100 , undefined, ASSET_ID, params));
    })
}

getVoters().then(()=>{
    if(committedAmount>=50000000){
        rewardAmount=3000000;
    }
    else if(committedAmount>=70000000){
        rewardAmount=6000000;
    }
    else if(committedAmount>=90000000){
        rewardAmount=9000000
    }
    else{
        reward=10;
    }
    var ratio=(rewardAmount*100)/committedAmount
    ratio=truncateDecimals(ratio, 2);   

    draftTransaction(voters, ratio).then(async()=>{
        let txgroup = algosdk.assignGroupID(transactions);
        transactions.forEach((transaction)=>{
            var signedTransaction=transaction.signTxn(secretKey.sk );
            signed.push(signedTransaction);
        })

        let tx = await algodClient.sendRawTransaction(signed).do();
        console.log("Transaction : " + tx.txId);
    })  
});





