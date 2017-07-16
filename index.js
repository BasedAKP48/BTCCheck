// firebase-admin is what allows us to connect to the Firebase database.
const admin = require('firebase-admin');
const parseArgs = require('minimist');

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
    let args = parseArgs(text);
    btccheck(args._.join(' '), args.compressed).then((info) => {
      let resp = `Address: ${info.address}, Current BTC: ${fromSAT(info.final_balance)}, Total BTC Seen: ${fromSAT(info.total_received)}, Total Transactions: ${info.n_tx}, WIF: ${info.wif}.`;
      sendMessage(msg, resp, {
        discord_embed: {
          title: "Bitcoin Address Information",
          url: `https://blockchain.info/address/${info.address}`,
          color: 0x119900,
          footer: {
            text: "Data via blockchain.info",
            icon_url: "https://akp48.akpmakes.tech/img/blockchain.info.png"
          },
          fields: [
            {
              name: "Address",
              value: info.address,
              inline: false
            },
            {
              name: "Private Key (WIF)",
              value: info.wif,
              inline: false
            },
            {
              name: "Current BTC",
              value: fromSAT(info.final_balance),
              inline: false
            },
            {
              name: "Total BTC Seen",
              value: fromSAT(info.total_received),
              inline: false
            },
            {
              name: "Total Transactions",
              value: info.n_tx,
              inline: false
            }
          ]
        }
      });
    }, (error) => {
      sendMessage(msg, `Error: ${error.error}`, {
        discord_embed: {
          title: "Bitcoin Address Information",
          color: 0xBA3232,
          footer: {
            text: "Data via blockchain.info",
            icon_url: "https://akp48.akpmakes.tech/img/blockchain.info.png"
          },
          fields: [
            {
              name: "Error",
              value: error.error,
              inline: false
            }
          ]
        }
      });
    });
	}

});

function sendMessage(msg, text, extra) {
  let response = {
    uid: 'bitcoin-address-checker',
    cid: 'bitcoin-address-checker',
    text: text,
    channel: msg.channel,
    msgType: 'chatMessage',
    timeReceived: Date.now(),
    extra_client_info: extra
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