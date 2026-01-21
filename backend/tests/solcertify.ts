import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";

describe("solcertify", () => {
  // Configuration de l'environnement de test
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Utiliser any pour éviter les problèmes de types avec l'IDL
  const program = anchor.workspace.Solcertify as Program<any>;

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
      console.log("Certificateur ajouté");
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
      console.log("Deuxième certificateur ajouté");
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
      console.log("Certificateur retiré");
    });
  });

  describe("Tests de base - Émission de certificats", () => {
    it("Émet un certificat de type Standard", async () => {
      const serialNumber = "ROLEX-SUB-001";
      const [certificatePda] = getCertificatePda(serialNumber);
      const [ownerActivityPda] = getUserActivityPda(owner1.publicKey);

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

      const certificate = await program.account.certificate.fetch(certificatePda);
      expect(certificate.serialNumber).to.equal(serialNumber);
      expect(certificate.brand).to.equal("Rolex");

      const authority = await program.account.certificationAuthority.fetch(authorityPda);
      expect(authority.totalIssued.toNumber()).to.equal(1);
      expect(authority.standardCount.toNumber()).to.equal(1);

      console.log("Certificat Standard émis:", serialNumber);
    });

    it("Émet un certificat de type Premium", async () => {
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

      const authority = await program.account.certificationAuthority.fetch(authorityPda);
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
      } catch (err: any) {
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
      } catch (err: any) {
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
      } catch (err: any) {
        expect(err).to.exist;
        console.log("Erreur attendue: numéro de série déjà existant");
      }
    });
  });

  // ==================== TESTS DES CONTRAINTES ====================
  describe("Tests des contraintes", () => {
    it("Vérifie la limite de 4 certificats par utilisateur", async () => {
      // owner2 a 3 certificats, on ajoute le 4ème
      const serialNumber = "OMEGA-SPEED-005";
      const [certificatePda] = getCertificatePda(serialNumber);
      const [ownerActivityPda] = getUserActivityPda(owner2.publicKey);

      await program.methods
        .issueCertificate(
          serialNumber,
          "Omega",
          "Speedmaster",
          { standard: {} },
          new anchor.BN(6000),
          "ipfs://QmOmegaSpeedmaster005"
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

      const ownerActivity = await program.account.userActivity.fetch(ownerActivityPda);
      expect(ownerActivity.certificateCount).to.equal(4);
      console.log("owner2 a maintenant 4 certificats (limite atteinte)");
    });

    it("Impossible de dépasser 4 certificats (MaxCertificatesReached)", async () => {
      const serialNumber = "BREITLING-NAV-006";
      const [certificatePda] = getCertificatePda(serialNumber);
      const [ownerActivityPda] = getUserActivityPda(owner2.publicKey);

      try {
        await program.methods
          .issueCertificate(
            serialNumber,
            "Breitling",
            "Navitimer",
            { standard: {} },
            new anchor.BN(4000),
            "ipfs://QmBreitlingNav006"
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

        expect.fail("Devrait lever une erreur MaxCertificatesReached");
      } catch (err: any) {
        expect(err.toString()).to.include("MaxCertificatesReached");
        console.log("Erreur attendue: limite de 4 certificats atteinte");
      }
    });

    it("Vérifie qu'un certificateur ne peut pas être ajouté en double", async () => {
      try {
        await program.methods
          .addCertifier(certifier.publicKey)
          .accounts({
            admin: admin.publicKey,
            authority: authorityPda,
          })
          .signers([admin])
          .rpc();

        expect.fail("Devrait lever une erreur CertifierAlreadyExists");
      } catch (err: any) {
        expect(err.toString()).to.include("CertifierAlreadyExists");
        console.log("Erreur attendue: certificateur déjà dans la liste");
      }
    });
  });

  // ==================== TESTS D'INTÉGRATION ====================
  describe("Tests d'intégration - Vérification et Transfert", () => {
    it("Vérifie un certificat existant", async () => {
      const serialNumber = "ROLEX-SUB-001";
      const [certificatePda] = getCertificatePda(serialNumber);

      const result = await program.methods
        .verifyCertificate()
        .accounts({
          certificate: certificatePda,
          authority: authorityPda,
        })
        .view();

      expect(result.serialNumber).to.equal(serialNumber);
      expect(result.brand).to.equal("Rolex");
      console.log("Certificat vérifié:", serialNumber);
    });

    it("Le certificat est verrouillé après émission", async () => {
      const serialNumber = "ROLEX-SUB-001";
      const [certificatePda] = getCertificatePda(serialNumber);
      const [fromActivityPda] = getUserActivityPda(owner1.publicKey);
      const [toActivityPda] = getUserActivityPda(owner2.publicKey);

      try {
        await program.methods
          .transferCertificate()
          .accounts({
            from: owner1.publicKey,
            to: owner2.publicKey,
            certificate: certificatePda,
            fromActivity: fromActivityPda,
            toActivity: toActivityPda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([owner1])
          .rpc();

        expect.fail("Devrait lever une erreur");
      } catch (err: any) {
        const errStr = err.toString();
        expect(errStr.includes("CertificateLocked") || errStr.includes("CooldownNotElapsed")).to.be.true;
        console.log("Erreur attendue: certificat verrouillé ou cooldown");
      }
    });

    it("On ne peut pas transférer un certificat sans être propriétaire", async () => {
      const serialNumber = "ROLEX-SUB-001";
      const [certificatePda] = getCertificatePda(serialNumber);
      const [fromActivityPda] = getUserActivityPda(owner2.publicKey);
      const [toActivityPda] = getUserActivityPda(unauthorized.publicKey);

      try {
        await program.methods
          .transferCertificate()
          .accounts({
            from: owner2.publicKey,
            to: unauthorized.publicKey,
            certificate: certificatePda,
            fromActivity: fromActivityPda,
            toActivity: toActivityPda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([owner2])
          .rpc();

        expect.fail("Devrait lever une erreur NotOwner");
      } catch (err: any) {
        expect(err).to.exist;
        console.log("Erreur attendue: non-propriétaire");
      }
    });
  });

  // ==================== RÉSUMÉ ====================
  describe("Résumé final", () => {
    it("Affiche les statistiques finales", async () => {
      const authority = await program.account.certificationAuthority.fetch(authorityPda);

      console.log("\n========== RÉSUMÉ DES TESTS ==========");
      console.log("Total certificats émis:", authority.totalIssued.toNumber());
      console.log("- Standard:", authority.standardCount.toNumber());
      console.log("- Premium:", authority.premiumCount.toNumber());
      console.log("- Luxury:", authority.luxuryCount.toNumber());
      console.log("- Exceptional:", authority.exceptionalCount.toNumber());
      console.log("=======================================\n");

      expect(authority.totalIssued.toNumber()).to.be.greaterThan(0);
    });
  });
});
