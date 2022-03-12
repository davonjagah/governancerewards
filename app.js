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
var mergedvoters=[];
    
var transactions=[];
var signed=[];
var committedAmount=0;
var rewardAmount;
var addresses=[{addr:'5CLFBFI33DFGZTCNTIG7FURBRC57E6JA2PI4PZC7PBGPQLXIFV4PCBVYHQ'
},{addr:'6572Q2UUMYTVHKIZGZPQIHDQ3RIJ2EUE2IBIEHATZ7GUWSTZKU45PAM74E'}];

var rewardMmemonic='horse name glow spider seek float thumb excess express below vanish furnace shallow charge cycle orchard ketchup laugh romance hope cushion this wrong absent scene'
var secretKey=algosdk.mnemonicToSecretKey(rewardMmemonic); //Put address two Mnemonic Phrase here

function find(address){
    var foundat;
    for(var i=0; i<mergedvoters.length; i++){
      if(mergedvoters[i].sender==address){
        foundat=i;
        break;
      }
    }
    return foundat;
}

function truncateDecimals(number, digits) {
    var multiplier = Math.pow(10, digits),
        adjustedNum = number * multiplier,
        truncatedNum = Math[adjustedNum < 0 ? 'ceil' : 'floor'](adjustedNum);

    return truncatedNum / multiplier;
};





async function getVoters(){
       
    for(address of addresses){
        var txnHistory = await indexerClient
        .searchForTransactions()
        .address(address.addr)
        .assetID(ASSET_ID)
        .addressRole("receiver")
        .txType("axfer")
        .do();

       

     await txnHistory.transactions.map(receiver=>{
          if((receiver['asset-transfer-transaction'].amount)/100 >1){
                voters.push({
                    sender:receiver.sender,
                    amount:(receiver['asset-transfer-transaction'].amount)/100
                })
            
           
            committedAmount+=(receiver['asset-transfer-transaction'].amount)/100;
          } 
        })
    }
        
   
}

async function draftTransaction(voters, ratio){
    const params = await algodClient.getTransactionParams().do(); //get transaction params
    voters.forEach((voter)=>{
            transactions.push(algosdk.makeAssetTransferTxnWithSuggestedParams(secretKey.addr, voter.sender, undefined, undefined,  (voter.amount*ratio)*100 , undefined, ASSET_ID, params));
    })
    console.log(transactions)
}


getVoters().then(()=>{
    mergedvoters.push(voters[0]);

    for(var i=1; i<voters.length; i++){
        var exists=find(voters[i].sender);
        if(exists>=0){
          mergedvoters[exists].amount+= voters[i].amount;
        }
        else{
          mergedvoters.push(voters[i])
        }
    }
    
    rewardAmount=10;
    console.log("committed: ", committedAmount)
    var ratio=rewardAmount/committedAmount
    ratio=truncateDecimals(ratio, 2);   
    console.log("ratio: ",ratio)
    console.log(mergedvoters)

    draftTransaction(mergedvoters, 1).then(async()=>{
      
        let txgroup = algosdk.assignGroupID(transactions);
        transactions.forEach((transaction)=>{
            var signedTransaction=transaction.signTxn(secretKey.sk );
            signed.push(signedTransaction);
        })

        let tx = await algodClient.sendRawTransaction(signed).do();
      

        console.log("Transaction : " + tx.txId);
    })  
});





