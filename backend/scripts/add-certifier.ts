import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

async function main() {
    // Configure the client to use the local cluster.
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.Solcertify as Program<any>;

    const certifierPubkeyString = process.argv[2];
    if (!certifierPubkeyString) {
        console.error("Usage: npx ts-node scripts/add-certifier.ts <PUBKEY>");
        process.exit(1);
    }

    let certifierPubkey: PublicKey;
    try {
        certifierPubkey = new PublicKey(certifierPubkeyString);
    } catch (e) {
        console.error("Invalid Public Key provided.");
        process.exit(1);
    }

    console.log(`Ajout du certificateur: ${certifierPubkey.toBase58()}...`);

    // Use the same seed as in lib.rs and frontend
    const [authorityPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("auth_v5")],
        program.programId
    );

    try {
        // @ts-ignore
        const tx = await (program.methods as any)
            .addCertifier(certifierPubkey)
            .accounts({
                admin: provider.wallet.publicKey,
                authority: authorityPda,
            })
            .rpc();

        console.log("Succès ! Certificateur ajouté avec succès.");
        console.log(`Signature: ${tx}`);
    } catch (error: any) {
        console.error("Erreur lors de l'ajout:");
        console.error(error);
        if (error.error?.errorCode?.code === "CertifierAlreadyExists" || error.message?.includes("CertifierAlreadyExists")) {
            console.log("INFO: Ce wallet est DÉJÀ un certificateur.");
        }
    }
}

main().then(
    () => process.exit(),
    (err) => {
        console.error(err);
        process.exit(-1);
    }
);
