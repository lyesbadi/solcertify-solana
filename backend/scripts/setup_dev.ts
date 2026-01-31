import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import fs from "fs";
import os from "os";

// Helper to load wallet from file
function loadWallet(path: string): Keypair {
    const raw = fs.readFileSync(path, 'utf-8');
    const keypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(raw)));
    return keypair;
}

async function main() {
    // Configure client to use the local cluser.
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.Solcertify as any;

    // Load Admin Wallet
    const adminWallet = loadWallet("tests/keypairs/admin.json");
    console.log("Starting Setup Script...");
    console.log("Admin Wallet:", adminWallet.publicKey.toString());

    // 1. Initialize Authority
    const [authorityPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("auth_v5")],
        program.programId
    );

    try {
        await program.account.certificationAuthority.fetch(authorityPda);
        console.log("Authority already initialized.");
    } catch (e) {
        console.log("Initializing Authority...");
        await program.methods.initialize()
            .accounts({
                admin: adminWallet.publicKey,
                authority: authorityPda,
                treasury: adminWallet.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .signers([adminWallet])
            .rpc();
        console.log("Authority initialized!");
    }

    // 2. Load Certifiers
    console.log("\nLoading Certifiers...");
    let certifiersList: any[] = [];

    try {
        const cert1 = loadWallet("tests/keypairs/certifier1.json");
        console.log(`   - Loaded Certifier 1: ${cert1.publicKey.toString()}`);
        certifiersList.push({
            keypair: cert1,
            name: "Maison Duval Horlogerie",
            address: "24 Place Vendome, 75001 Paris"
        });
    } catch (e) { console.error("Could not load certifier1.json"); }

    try {
        const cert2 = loadWallet("tests/keypairs/certifier2.json");
        console.log(`   - Loaded Certifier 2: ${cert2.publicKey.toString()}`);
        certifiersList.push({
            keypair: cert2,
            name: "Atelier Prestige Lyon",
            address: "18 Rue de la Republique, 69002 Lyon"
        });
    } catch (e) { console.error("Could not load certifier2.json"); }

    // DUPLICATE CHECK
    if (certifiersList.length >= 2) {
        if (certifiersList[0].keypair.publicKey.toBase58() === certifiersList[1].keypair.publicKey.toBase58()) {
            console.error("\nCRITICAL ERROR: Certifier 1 and Certifier 2 have the SAME Public Key!");
            console.error("   Check your .env file and ensure ADDRESS_CERTIFICATEUR_1_PRVT and ADDRESS_CERTIFICATEUR_2_PRVT are different.");
            return;
        }
    }

    // 3. Register Certifiers
    console.log("\nRegistering Certifiers on-chain...");

    for (const cert of certifiersList) {
        const certifierPubkey = cert.keypair.publicKey;
        const [profilePda] = PublicKey.findProgramAddressSync(
            [Buffer.from("certifier_profile"), certifierPubkey.toBuffer()],
            program.programId
        );

        // Check if already registered in Authority List
        let isRegisteredInList = false;
        try {
            const authAccount = await program.account.certificationAuthority.fetch(authorityPda);
            const approved = authAccount.approvedCertifiers as PublicKey[];
            if (approved.some((k: PublicKey) => k.toString() === certifierPubkey.toString())) {
                isRegisteredInList = true;
            }
        } catch (e) { }

        // Check if Profile Account Exists
        let profileExists = false;
        try {
            await program.account.certifierProfile.fetch(profilePda);
            profileExists = true;
        } catch (e) { }

        console.log(`   > Processing ${cert.name} (${certifierPubkey.toString().slice(0, 8)}...)`);
        console.log(`     State: InList=${isRegisteredInList}, ProfileExists=${profileExists}`);

        if (isRegisteredInList && profileExists) {
            console.log(`Already fully registered.`);
            continue;
        }

        if (profileExists && !isRegisteredInList) {
            console.warn(`Profile exists but NOT in list. Skipping to avoid "Already in use" error.`);
            // Cannot fix without resetting or manual intervention in devnet
            continue;
        }

        // Add Certifier
        try {
            // Airdrop SOL (fire and forget)
            try {
                const s = await provider.connection.requestAirdrop(certifierPubkey, 1 * LAMPORTS_PER_SOL);
                await provider.connection.confirmTransaction(s);
            } catch (e) { }

            await program.methods.addCertifier(
                certifierPubkey,
                cert.name,
                cert.address
            )
                .accounts({
                    admin: adminWallet.publicKey,
                    authority: authorityPda,
                    certifierProfile: profilePda,
                    systemProgram: anchor.web3.SystemProgram.programId,
                })
                .signers([adminWallet])
                .rpc();
            console.log("Registered successfully!");
        } catch (e: any) {
            if (e.toString().includes("0x0")) {
                console.log("Failed (Account already in use). Expected if previously run.");
            } else {
                console.error(`Failed:`, e);
            }
        }
    }

    console.log("\nSetup Complete!");
}

main().then(() => process.exit(0)).catch(err => {
    console.error("Script failed:", err);
    process.exit(1);
});
