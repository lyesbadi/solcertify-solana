import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import * as fs from 'fs';

async function main() {
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

    // CHARGEMENT DE LA VRAIE CLÉ ADMIN DES TESTS
    // Si le fichier n'existe pas, on fallback sur le provider wallet
    let adminKeypair: Keypair | undefined;
    try {
        const keyData = JSON.parse(fs.readFileSync('tests/keypairs/admin.json', 'utf-8'));
        adminKeypair = Keypair.fromSecretKey(new Uint8Array(keyData));
        console.log(`Admin chargé (fichier de test): ${adminKeypair.publicKey.toBase58()}`);
    } catch (e) {
        console.log("Fichier admin.json non trouvé, utilisation du wallet provider par défaut.");
    }

    console.log(`Ajout du certificateur: ${certifierPubkey.toBase58()}...`);

    const [authorityPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("auth_v5")],
        program.programId
    );

    try {
        let tx;
        if (adminKeypair) {
            // Si on a la clé admin spécifique
            // @ts-ignore
            tx = await (program.methods as any)
                .addCertifier(certifierPubkey)
                .accounts({
                    admin: adminKeypair.publicKey,
                    authority: authorityPda,
                })
                .signers([adminKeypair])
                .rpc();
        } else {
            // Sinon on utilise le provider (pour un admin frais)
            // @ts-ignore
            tx = await (program.methods as any)
                .addCertifier(certifierPubkey)
                .accounts({
                    admin: provider.wallet.publicKey,
                    authority: authorityPda,
                })
                .rpc();
        }

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
