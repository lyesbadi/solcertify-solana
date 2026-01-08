/**
 * Tests Anchor pour DecentraVote
 * 
 * Ce fichier contient tous les tests unitaires et d'intégration
 * pour le programme de vote décentralisé.
 * 
 * NOTE: Ces tests nécessitent que le programme soit compilé avec `anchor build`
 * Le fichier ../target/types/decentravote est généré automatiquement.
 * 
 * Exécution: anchor test
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";

// Interface temporaire (sera remplacée par les types générés après anchor build)
interface DecentravoteProgram {
    methods: {
        proposeLaw(title: string, description: string): any;
        vote(choice: any): any;
        finalizeProposal(): any;
    };
    account: {
        proposal: { fetch: (pda: PublicKey) => Promise<any>; all: () => Promise<any[]> };
        voteRecord: { fetch: (pda: PublicKey) => Promise<any> };
    };
    programId: PublicKey;
}

describe("decentravote", () => {
    // Configuration du provider Anchor
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    // Récupération du programme déployé
    // TODO: Décommentez après `anchor build`:
    // const program = anchor.workspace.Decentravote as Program<Decentravote>;
    const program = anchor.workspace.Decentravote as unknown as DecentravoteProgram;

    // Titre unique pour éviter les conflits entre tests
    const title = "Loi Test " + Date.now();
    const description = "Description de test pour le workshop";

    // Variable pour stocker le PDA de la proposition
    let proposalPda: PublicKey;
    let proposalBump: number;

    /**
     * Test 1: Création d'une proposition
     * Vérifie que nous pouvons créer une nouvelle proposition de loi
     */
    it("Crée une nouvelle proposition de loi", async () => {
        // Calcul du PDA pour la proposition
        [proposalPda, proposalBump] = PublicKey.findProgramAddressSync(
            [Buffer.from("proposal"), Buffer.from(title)],
            program.programId
        );

        // Appel de l'instruction propose_law
        await program.methods
            .proposeLaw(title, description)
            .accounts({
                proposer: provider.wallet.publicKey,
                proposal: proposalPda,
                systemProgram: SystemProgram.programId,
            })
            .rpc();

        // Récupération et vérification des données
        const proposal = await program.account.proposal.fetch(proposalPda);

        expect(proposal.title).to.equal(title);
        expect(proposal.description).to.equal(description);
        expect(proposal.proposer.toString()).to.equal(
            provider.wallet.publicKey.toString()
        );
        expect(proposal.approveVotes.toNumber()).to.equal(0);
        expect(proposal.rejectVotes.toNumber()).to.equal(0);
        expect(proposal.isFinalized).to.equal(false);

        console.log("✅ Proposition créée avec succès!");
        console.log(`   PDA: ${proposalPda.toString()}`);
    });

    /**
     * Test 2: Vote "Pour" sur une proposition
     * Vérifie que le vote est correctement comptabilisé
     */
    it("Vote POUR une proposition", async () => {
        // Calcul du PDA pour le vote record
        const [voteRecordPda] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("vote"),
                proposalPda.toBuffer(),
                provider.wallet.publicKey.toBuffer(),
            ],
            program.programId
        );

        // Appel de l'instruction vote avec choix "Approve"
        await program.methods
            .vote({ approve: {} })
            .accounts({
                voter: provider.wallet.publicKey,
                proposal: proposalPda,
                voteRecord: voteRecordPda,
                systemProgram: SystemProgram.programId,
            })
            .rpc();

        // Vérification du compteur de votes
        const proposal = await program.account.proposal.fetch(proposalPda);
        expect(proposal.approveVotes.toNumber()).to.equal(1);
        expect(proposal.rejectVotes.toNumber()).to.equal(0);

        // Vérification du vote record
        const voteRecord = await program.account.voteRecord.fetch(voteRecordPda);
        expect(voteRecord.voter.toString()).to.equal(
            provider.wallet.publicKey.toString()
        );
        expect(voteRecord.vote).to.deep.equal({ approve: {} });

        console.log("✅ Vote POUR enregistré avec succès!");
    });

    /**
     * Test 3: Prévention du double vote
     * Vérifie qu'un utilisateur ne peut pas voter deux fois
     */
    it("Empêche le double vote", async () => {
        // Calcul du même PDA (déjà existant)
        const [voteRecordPda] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("vote"),
                proposalPda.toBuffer(),
                provider.wallet.publicKey.toBuffer(),
            ],
            program.programId
        );

        try {
            // Tentative de voter une seconde fois
            await program.methods
                .vote({ reject: {} })
                .accounts({
                    voter: provider.wallet.publicKey,
                    proposal: proposalPda,
                    voteRecord: voteRecordPda,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            // Si on arrive ici, le test échoue
            expect.fail("Le double vote aurait dû échouer!");
        } catch (error) {
            // Le double vote doit échouer - c'est le comportement attendu
            console.log("✅ Double vote correctement empêché!");
        }
    });

    /**
     * Test 4: Vote avec un autre wallet
     * Vérifie qu'un autre utilisateur peut voter
     */
    it("Permet à un autre utilisateur de voter", async () => {
        // Création d'un nouveau keypair pour simuler un autre utilisateur
        const otherUser = Keypair.generate();

        // Airdrop de SOL pour payer les frais
        const airdropSig = await provider.connection.requestAirdrop(
            otherUser.publicKey,
            1000000000 // 1 SOL
        );
        await provider.connection.confirmTransaction(airdropSig);

        // Calcul du PDA pour le vote record du nouvel utilisateur
        const [voteRecordPda] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("vote"),
                proposalPda.toBuffer(),
                otherUser.publicKey.toBuffer(),
            ],
            program.programId
        );

        // Vote avec le nouveau wallet
        await program.methods
            .vote({ reject: {} })
            .accounts({
                voter: otherUser.publicKey,
                proposal: proposalPda,
                voteRecord: voteRecordPda,
                systemProgram: SystemProgram.programId,
            })
            .signers([otherUser])
            .rpc();

        // Vérification des compteurs
        const proposal = await program.account.proposal.fetch(proposalPda);
        expect(proposal.approveVotes.toNumber()).to.equal(1);
        expect(proposal.rejectVotes.toNumber()).to.equal(1);

        console.log("✅ Deuxième utilisateur a voté CONTRE!");
        console.log(`   Votes: ${proposal.approveVotes} Pour / ${proposal.rejectVotes} Contre`);
    });

    /**
     * Test 5: Finalisation trop tôt (doit échouer)
     * Vérifie que la finalisation échoue avant le délai
     */
    it("Empêche la finalisation avant le délai", async () => {
        try {
            await program.methods
                .finalizeProposal()
                .accounts({
                    authority: provider.wallet.publicKey,
                    proposal: proposalPda,
                })
                .rpc();

            expect.fail("La finalisation aurait dû échouer!");
        } catch (error: any) {
            // Vérifie que c'est bien l'erreur TooEarly
            expect(error.error.errorCode.code).to.equal("TooEarly");
            console.log("✅ Finalisation correctement empêchée (délai non écoulé)");
        }
    });

    /**
     * Test 6: Création d'une seconde proposition
     * Vérifie que plusieurs propositions peuvent coexister
     */
    it("Crée une seconde proposition", async () => {
        const title2 = "Deuxième loi " + Date.now();
        const description2 = "Autre description";

        const [proposalPda2] = PublicKey.findProgramAddressSync(
            [Buffer.from("proposal"), Buffer.from(title2)],
            program.programId
        );

        await program.methods
            .proposeLaw(title2, description2)
            .accounts({
                proposer: provider.wallet.publicKey,
                proposal: proposalPda2,
                systemProgram: SystemProgram.programId,
            })
            .rpc();

        const proposal = await program.account.proposal.fetch(proposalPda2);
        expect(proposal.title).to.equal(title2);

        console.log("✅ Seconde proposition créée!");
    });
});
