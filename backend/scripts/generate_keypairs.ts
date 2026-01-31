import * as anchor from "@coral-xyz/anchor";
import { Keypair } from "@solana/web3.js";
import fs from "fs";
import bs58 from "bs58";
import dotenv from "dotenv";

dotenv.config();

function saveKeypair(privateKeyBase58: string, name: string) {
    if (!privateKeyBase58) {
        console.warn(`No private key found for ${name}`);
        return;
    }

    try {
        const secretKey = bs58.decode(privateKeyBase58);
        const keypair = Keypair.fromSecretKey(secretKey);
        const path = `tests/keypairs/${name}.json`;

        fs.writeFileSync(path, JSON.stringify(Array.from(secretKey)));
        console.log(`Saved ${name}: ${keypair.publicKey.toString()}`);
    } catch (e) {
        console.error(`Failed to save ${name}:`, e);
    }
}

async function main() {
    console.log("Generating Keypairs from .env...");

    // Ensure directory exists
    if (!fs.existsSync("tests/keypairs")) {
        fs.mkdirSync("tests/keypairs", { recursive: true });
    }

    saveKeypair(process.env.ADDRESS_ADMIN_PRVT!, "admin");
    saveKeypair(process.env.ADDRESS_DEMANDEUR_PRVT!, "demandeur");
    saveKeypair(process.env.ADDRESS_CERTIFICATEUR_1_PRVT!, "certifier1");
    saveKeypair(process.env.ADDRESS_CERTIFICATEUR_2_PRVT!, "certifier2");

    console.log("Keypairs ready for testing!");
}

main().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
