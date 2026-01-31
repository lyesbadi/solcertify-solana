import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL, Transaction, SystemProgram, sendAndConfirmTransaction } from "@solana/web3.js";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

function loadKeypair(path: string): Keypair {
    const raw = fs.readFileSync(path, 'utf-8');
    return Keypair.fromSecretKey(new Uint8Array(JSON.parse(raw)));
}

async function main() {
    // Connect to localhost by default
    const connection = new Connection("http://127.0.0.1:8899", "confirmed");

    // Load Admin Keypair for funding
    let adminKeypair: Keypair;
    try {
        adminKeypair = loadKeypair("tests/keypairs/admin.json");
    } catch (e) {
        console.error("Could not load Admin keypair from tests/keypairs/admin.json. Make sure to run generate_keypairs.ts first.");
        return;
    }

    const wallets = [
        { name: "Admin (Source)", pubkey: adminKeypair.publicKey.toBase58() },
        { name: "Demandeur", pubkey: process.env.ADDRESS_DEMANDEUR },
        { name: "Certifier 1", pubkey: process.env.ADDRESS_CERTIFICATEUR_1 },
        { name: "Certifier 2", pubkey: process.env.ADDRESS_CERTIFICATEUR_2 },
    ];

    console.log("Checking Wallet Balances & Auto-Funding from Admin...\n");

    for (const w of wallets) {
        if (!w.pubkey) continue;

        try {
            const pk = new PublicKey(w.pubkey);
            const balance = await connection.getBalance(pk);
            const sol = balance / LAMPORTS_PER_SOL;

            console.log(`${w.name.padEnd(20)} : ${sol.toFixed(4)} SOL`);

            // If low balance AND not admin (admin is source)
            if (sol < 2.0 && w.pubkey !== adminKeypair.publicKey.toBase58()) {
                console.log(`Sending 5 SOL from Admin to ${w.name}...`);

                const tx = new Transaction().add(
                    SystemProgram.transfer({
                        fromPubkey: adminKeypair.publicKey,
                        toPubkey: pk,
                        lamports: 5 * LAMPORTS_PER_SOL,
                    })
                );

                try {
                    const signature = await sendAndConfirmTransaction(connection, tx, [adminKeypair]);
                    console.log(`Transfer successful. Sig: ${signature.slice(0, 10)}...`);
                } catch (e) {
                    console.log(`Transfer failed:`, e);
                }
            }
        } catch (e) {
            console.log(`Error checking ${w.name}:`, e);
        }
    }

    console.log("\nDone.");
}

main().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
