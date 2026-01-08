
const { Keypair } = require('@solana/web3.js');
const fs = require('fs');
const bs58 = require('bs58');

const keypairData = JSON.parse(fs.readFileSync('C:\\Users\\choug\\.config\\solana\\id.json', 'utf-8'));
const keypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
console.log(bs58.encode(keypair.secretKey));
console.log(keypair);
