// firebase-admin is what allows us to connect to the Firebase database.
const admin = require('firebase-admin');

/**
 * A serviceAccount.json file is required to connect.
 */
const serviceAccount = require("./serviceAccount.json");

const btccheck = require('bitcoin-address-checker').getAddressInfoFromString;

// Initialize the Firebase app. Change the URL below if you're using another Firebase database.
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://basedakp48.firebaseio.com"
});

const rootRef = admin.database().ref();

rootRef.child('messages').orderByChild('timeReceived').startAt(Date.now()).on('child_added', (e) => {
  let msg = e.val();
  console.log(msg);
  let text = msg.text.split(' ');

	if(text[0].toLowerCase() == '.btccheck') {
    text.shift();
    btccheck(text.join(' ')).then((info) => {
      let resp = `Address: ${info.address}, Current BTC: ${fromSAT(info.final_balance)}, Total BTC Seen: ${fromSAT(info.total_received)}, Total Transactions: ${info.n_tx}, WIF: ${info.wif}.`;
      sendMessage(msg, resp);
    }, (error) => {
      sendMessage(msg, `Error: ${error.error}`);
    });
	}

});

function sendMessage(msg, text) {
  let response = {
    uid: 'bitcoin-address-checker',
    cid: 'bitcoin-address-checker',
    text: text,
    channel: msg.channel,
    msgType: 'chatMessage',
    timeReceived: Date.now()
  }

  let responseRef = rootRef.child('messages').push();
  let responseKey = responseRef.key;

  let updateData = {};
  updateData[`messages/${responseKey}`] = response;
  updateData[`clients/${msg.cid}/${responseKey}`] = response;

  return rootRef.update(updateData);
}

function fromSAT(val) {
  return Number(val/100000000).toFixed(8);
}