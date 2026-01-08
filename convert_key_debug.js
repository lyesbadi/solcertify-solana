const bs58 = require("bs58");
console.log("Type of bs58:", typeof bs58);
console.log("Keys of bs58:", Object.keys(bs58));
try {
  const fs = require("fs");
  const keypairData = JSON.parse(fs.readFileSync("C:\\Users\\choug\\.config\\solana\\id.json", "utf-8"));
  const encoder = bs58.encode ? bs58.encode : bs58.default ? bs58.default.encode : null;
  if (encoder) {
    console.log("Private Key (Base58):");
    console.log(encoder(Uint8Array.from(keypairData)));
  } else {
    console.error("Could not find encode function on bs58 module");
  }
} catch (e) {
  console.error(e);
}
