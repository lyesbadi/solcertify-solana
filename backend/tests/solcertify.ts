import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Solcertify } from "../target/types/solcertify";
import { expect } from "chai";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";

describe("solcertify", () => {
  // Configuration de l'environnement de test
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Solcertify as Program<Solcertify>;

  // Comptes de test
  let admin: Keypair;
  let certifier: Keypair;
  let certifier2: Keypair;
  let owner1: Keypair;
  let owner2: Keypair;
  let treasury: Keypair;
  let unauthorized: Keypair;

  // PDAs
  let authorityPda: PublicKey;
  let authorityBump: number;

  // Fonction utilitaire pour airdrop et confirmation
  async function airdrop(pubkey: PublicKey, amount: number = 10) {
    const sig = await provider.connection.requestAirdrop(
      pubkey,
      amount * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig, "confirmed");
  }

  // Fonction utilitaire pour calculer les PDAs
  function getCertificatePda(serialNumber: string): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("certificate"), Buffer.from(serialNumber)],
      program.programId
    );
  }

  function getUserActivityPda(user: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("user_activity"), user.toBuffer()],
      program.programId
    );
  }

  before(async () => {
    console.log("Programme ID:", program.programId.toBase58());

    // Générer les keypairs
    admin = Keypair.generate();
    certifier = Keypair.generate();
    certifier2 = Keypair.generate();
    owner1 = Keypair.generate();
    owner2 = Keypair.generate();
    treasury = Keypair.generate();
    unauthorized = Keypair.generate();

    // Airdrop SOL pour les tests
    await airdrop(admin.publicKey, 10);
    await airdrop(certifier.publicKey, 10);
    await airdrop(certifier2.publicKey, 10);
    await airdrop(owner1.publicKey, 5);
    await airdrop(owner2.publicKey, 5);
    await airdrop(unauthorized.publicKey, 2);

    // Calculer authority PDA
    [authorityPda, authorityBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("authority")],
      program.programId
    );

    console.log("Authority PDA:", authorityPda.toBase58());
    console.log("Admin:", admin.publicKey.toBase58());
    console.log("Certifier:", certifier.publicKey.toBase58());
  });

  // ==================== TESTS DE BASE ====================
  describe("Tests de base - Initialisation", () => {
    it("Initialise l'autorité de certification", async () => {
      await program.methods
        .initialize()
        .accounts({
          admin: admin.publicKey,
          authority: authorityPda,
          treasury: treasury.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([admin])
        .rpc();

      const authority = await program.account.certificationAuthority.fetch(authorityPda);

      expect(authority.admin.toString()).to.equal(admin.publicKey.toString());
      expect(authority.treasury.toString()).to.equal(treasury.publicKey.toString());
      expect(authority.approvedCertifiers).to.have.lengthOf(0);
      expect(authority.totalIssued.toNumber()).to.equal(0);
      expect(authority.standardCount.toNumber()).to.equal(0);
      expect(authority.premiumCount.toNumber()).to.equal(0);
      expect(authority.luxuryCount.toNumber()).to.equal(0);
      expect(authority.exceptionalCount.toNumber()).to.equal(0);

      console.log("Autorité initialisée avec succès");
    });
  });

  describe("Tests de base - Gestion des certificateurs", () => {
    it("Ajoute un certificateur agréé", async () => {
      await program.methods
        .addCertifier(certifier.publicKey)
        .accounts({
          admin: admin.publicKey,
          authority: authorityPda,
        })
        .signers([admin])
        .rpc();

      const authority = await program.account.certificationAuthority.fetch(authorityPda);

      expect(authority.approvedCertifiers).to.have.lengthOf(1);
      expect(authority.approvedCertifiers[0].toString()).to.equal(certifier.publicKey.toString());

      console.log("Certificateur ajouté:", certifier.publicKey.toBase58());
    });

    it("Ajoute un deuxième certificateur", async () => {
      await program.methods
        .addCertifier(certifier2.publicKey)
        .accounts({
          admin: admin.publicKey,
          authority: authorityPda,
        })
        .signers([admin])
        .rpc();

      const authority = await program.account.certificationAuthority.fetch(authorityPda);

      expect(authority.approvedCertifiers).to.have.lengthOf(2);
      expect(authority.approvedCertifiers[1].toString()).to.equal(certifier2.publicKey.toString());

      console.log("Deuxième certificateur ajouté:", certifier2.publicKey.toBase58());
    });

    it("Retire un certificateur", async () => {
      await program.methods
        .removeCertifier(certifier2.publicKey)
        .accounts({
          admin: admin.publicKey,
          authority: authorityPda,
        })
        .signers([admin])
        .rpc();

      const authority = await program.account.certificationAuthority.fetch(authorityPda);

      expect(authority.approvedCertifiers).to.have.lengthOf(1);
      expect(authority.approvedCertifiers[0].toString()).to.equal(certifier.publicKey.toString());

      console.log("Certificateur retiré");
    });
  });

  describe("Tests de base - Émission de certificats", () => {
    it("Émet un certificat de type Standard", async () => {
      const serialNumber = "ROLEX-SUB-001";
      const [certificatePda] = getCertificatePda(serialNumber);
      const [ownerActivityPda] = getUserActivityPda(owner1.publicKey);

      const treasuryBalanceBefore = await provider.connection.getBalance(treasury.publicKey);

      await program.methods
        .issueCertificate(
          serialNumber,
          "Rolex",
          "Submariner Date",
          { standard: {} },
          new anchor.BN(5000),
          "ipfs://QmRolexSubmariner001"
        )
        .accounts({
          certifier: certifier.publicKey,
          owner: owner1.publicKey,
          authority: authorityPda,
          certificate: certificatePda,
          ownerActivity: ownerActivityPda,
          treasury: treasury.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([certifier])
        .rpc();

      // Vérifier le certificat
      const certificate = await program.account.certificate.fetch(certificatePda);

      expect(certificate.serialNumber).to.equal(serialNumber);
      expect(certificate.brand).to.equal("Rolex");
      expect(certificate.model).to.equal("Submariner Date");
      expect(certificate.owner.toString()).to.equal(owner1.publicKey.toString());
      expect(certificate.certifier.toString()).to.equal(certifier.publicKey.toString());
      expect(certificate.metadataUri).to.equal("ipfs://QmRolexSubmariner001");
      expect(certificate.estimatedValue.toNumber()).to.equal(5000);
      expect(certificate.previousOwners).to.have.lengthOf(0);

      // Vérifier les compteurs de l'autorité
      const authority = await program.account.certificationAuthority.fetch(authorityPda);
      expect(authority.totalIssued.toNumber()).to.equal(1);
      expect(authority.standardCount.toNumber()).to.equal(1);

      // Vérifier l'activité utilisateur
      const ownerActivity = await program.account.userActivity.fetch(ownerActivityPda);
      expect(ownerActivity.certificateCount).to.equal(1);

      // Vérifier le paiement des frais (0.05 SOL = 50_000_000 lamports)
      const treasuryBalanceAfter = await provider.connection.getBalance(treasury.publicKey);
      expect(treasuryBalanceAfter - treasuryBalanceBefore).to.equal(50_000_000);

      console.log("Certificat Standard émis:", serialNumber);
      console.log("Frais payés: 0.05 SOL");
    });

    it("Émet un certificat de type Premium", async () => {
      // Attendre le cooldown (simulé avec un délai court pour les tests)
      await new Promise(resolve => setTimeout(resolve, 1000));

      const serialNumber = "OMEGA-SEA-002";
      const [certificatePda] = getCertificatePda(serialNumber);
      const [ownerActivityPda] = getUserActivityPda(owner2.publicKey);

      await program.methods
        .issueCertificate(
          serialNumber,
          "Omega",
          "Seamaster Diver 300M",
          { premium: {} },
          new anchor.BN(8000),
          "ipfs://QmOmegaSeamaster002"
        )
        .accounts({
          certifier: certifier.publicKey,
          owner: owner2.publicKey,
          authority: authorityPda,
          certificate: certificatePda,
          ownerActivity: ownerActivityPda,
          treasury: treasury.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([certifier])
        .rpc();

      const certificate = await program.account.certificate.fetch(certificatePda);
      expect(certificate.serialNumber).to.equal(serialNumber);
      expect(certificate.brand).to.equal("Omega");

      const authority = await program.account.certificationAuthority.fetch(authorityPda);
      expect(authority.totalIssued.toNumber()).to.equal(2);
      expect(authority.premiumCount.toNumber()).to.equal(1);

      console.log("Certificat Premium émis:", serialNumber);
    });

    it("Émet un certificat de type Luxury", async () => {
      const serialNumber = "PATEK-NAU-003";
      const [certificatePda] = getCertificatePda(serialNumber);
      const [ownerActivityPda] = getUserActivityPda(owner2.publicKey);

      await program.methods
        .issueCertificate(
          serialNumber,
          "Patek Philippe",
          "Nautilus 5711",
          { luxury: {} },
          new anchor.BN(50000),
          "ipfs://QmPatekNautilus003"
        )
        .accounts({
          certifier: certifier.publicKey,
          owner: owner2.publicKey,
          authority: authorityPda,
          certificate: certificatePda,
          ownerActivity: ownerActivityPda,
          treasury: treasury.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([certifier])
        .rpc();

      const authority = await program.account.certificationAuthority.fetch(authorityPda);
      expect(authority.totalIssued.toNumber()).to.equal(3);
      expect(authority.luxuryCount.toNumber()).to.equal(1);

      console.log("Certificat Luxury émis:", serialNumber);
    });

    it("Émet un certificat de type Exceptional", async () => {
      const serialNumber = "AP-ROYAL-004";
      const [certificatePda] = getCertificatePda(serialNumber);
      const [ownerActivityPda] = getUserActivityPda(owner2.publicKey);

      await program.methods
        .issueCertificate(
          serialNumber,
          "Audemars Piguet",
          "Royal Oak",
          { exceptional: {} },
          new anchor.BN(150000),
          "ipfs://QmAPRoyalOak004"
        )
        .accounts({
          certifier: certifier.publicKey,
          owner: owner2.publicKey,
          authority: authorityPda,
          certificate: certificatePda,
          ownerActivity: ownerActivityPda,
          treasury: treasury.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([certifier])
        .rpc();

      const authority = await program.account.certificationAuthority.fetch(authorityPda);
      expect(authority.totalIssued.toNumber()).to.equal(4);
      expect(authority.exceptionalCount.toNumber()).to.equal(1);

      console.log("Certificat Exceptional émis:", serialNumber);
    });
  });

  // ==================== TESTS DE SÉCURITÉ ====================
  describe("Tests de sécurité", () => {
    it("Un utilisateur non autorisé ne peut pas ajouter de certificateur", async () => {
      try {
        await program.methods
          .addCertifier(unauthorized.publicKey)
          .accounts({
            admin: unauthorized.publicKey,
            authority: authorityPda,
          })
          .signers([unauthorized])
          .rpc();

        expect.fail("Devrait lever une erreur");
      } catch (err) {
        expect(err.toString()).to.include("Error");
        console.log("Erreur attendue: utilisateur non autorisé");
      }
    });

    it("Un utilisateur non certifié ne peut pas émettre de certificat", async () => {
      const serialNumber = "FAKE-WATCH-999";
      const [certificatePda] = getCertificatePda(serialNumber);
      const [ownerActivityPda] = getUserActivityPda(owner1.publicKey);

      try {
        await program.methods
          .issueCertificate(
            serialNumber,
            "Fake",
            "Watch",
            { standard: {} },
            new anchor.BN(100),
            "ipfs://fake"
          )
          .accounts({
            certifier: unauthorized.publicKey,
            owner: owner1.publicKey,
            authority: authorityPda,
            certificate: certificatePda,
            ownerActivity: ownerActivityPda,
            treasury: treasury.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([unauthorized])
          .rpc();

        expect.fail("Devrait lever une erreur UnauthorizedCertifier");
      } catch (err) {
        expect(err.toString()).to.include("UnauthorizedCertifier");
        console.log("Erreur attendue: certificateur non agréé");
      }
    });

    it("Impossible de créer deux certificats avec le même numéro de série", async () => {
      const serialNumber = "ROLEX-SUB-001"; // Déjà créé
      const [certificatePda] = getCertificatePda(serialNumber);
      const [ownerActivityPda] = getUserActivityPda(owner2.publicKey);

      try {
        await program.methods
          .issueCertificate(
            serialNumber,
            "Rolex Duplicate",
            "Test",
            { standard: {} },
            new anchor.BN(5000),
            "ipfs://duplicate"
          )
          .accounts({
            certifier: certifier.publicKey,
            owner: owner2.publicKey,
            authority: authorityPda,
            certificate: certificatePda,
            ownerActivity: ownerActivityPda,
            treasury: treasury.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([certifier])
          .rpc();

        expect.fail("Devrait lever une erreur - numéro de série dupliqué");
      } catch (err) {
        // Le compte existe déjà, donc Anchor lève une erreur
        expect(err).to.exist;
        console.log("Erreur attendue: numéro de série déjà existant");
      }
    });

    it("Un non-admin ne peut pas retirer un certificateur", async () => {
      // D'abord, réajouter certifier2 pour le test
      await program.methods
        .addCertifier(certifier2.publicKey)
        .accounts({
          admin: admin.publicKey,
          authority: authorityPda,
        })
        .signers([admin])
        .rpc();

      try {
        await program.methods
          .removeCertifier(certifier2.publicKey)
          .accounts({
            admin: unauthorized.publicKey,
            authority: authorityPda,
          })
          .signers([unauthorized])
          .rpc();

        expect.fail("Devrait lever une erreur");
      } catch (err) {
        expect(err.toString()).to.include("Error");
        console.log("Erreur attendue: non-admin ne peut pas retirer");
      }
    });
  });

  // Les tests de contraintes (cooldown, lock, limite) seront dans le prochain commit
});
