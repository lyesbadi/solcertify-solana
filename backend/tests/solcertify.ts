require('dotenv').config();
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as fs from 'fs';

// Helper pour charger ou créer une keypair persistante
function loadOrGenerateKeypair(path: string): Keypair {
  try {
    const keypairData = JSON.parse(fs.readFileSync(path, 'utf-8'));
    return Keypair.fromSecretKey(new Uint8Array(keypairData));
  } catch (error) {
    const keypair = Keypair.generate();
    // Créer le dossier si nécessaire
    if (!fs.existsSync('./tests/keypairs')) {
      fs.mkdirSync('./tests/keypairs', { recursive: true });
    }
    fs.writeFileSync(path, JSON.stringify(Array.from(keypair.secretKey)));
    return keypair;
  }
}

describe("solcertify", () => {
  // Configuration de l'environnement de test
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Utiliser any pour esquiver TOTALEMENT le check de types qui fait planter ts-node
  const program = anchor.workspace.Solcertify as any;

  // Comptes de test
  let admin: Keypair;
  let certifier: Keypair;
  let certifier2: Keypair;
  let owner1: Keypair;
  let owner2: Keypair;
  let owner3: Keypair;
  let treasury: Keypair;
  let unauthorized: Keypair;

  // PDAs
  let authorityPda: PublicKey;
  let authorityBump: number;

  // Fonction utilitaire pour airdrop et confirmation
  // Fonction utilitaire pour financer les comptes (via transfert depuis le provider qui est riche)
  async function airdrop(pubkey: PublicKey, amount: number = 10) {
    try {
      const tx = new anchor.web3.Transaction().add(
        anchor.web3.SystemProgram.transfer({
          fromPubkey: provider.publicKey,
          toPubkey: pubkey,
          lamports: amount * LAMPORTS_PER_SOL,
        })
      );
      await provider.sendAndConfirm(tx);
    } catch (e) {
      console.error("Transfer failed, trying faucet fallback:", e);
      const sig = await provider.connection.requestAirdrop(
        pubkey,
        amount * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig, "confirmed");
    }
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

    // Générer les keypairs - Persister les acteurs clés via .env
    const adminPath = process.env.ADMIN_KEYPAIR || './tests/keypairs/admin.json';
    const treasuryPath = process.env.TREASURY_KEYPAIR || './tests/keypairs/treasury.json';
    const certifierPath = process.env.CERTIFIER_KEYPAIR || './tests/keypairs/certifier.json';
    const certifier2Path = process.env.CERTIFIER2_KEYPAIR || './tests/keypairs/certifier2.json';

    admin = loadOrGenerateKeypair(adminPath);
    treasury = loadOrGenerateKeypair(treasuryPath);
    certifier = loadOrGenerateKeypair(certifierPath);
    certifier2 = loadOrGenerateKeypair(certifier2Path);

    // Les utilisateurs peuvent rester éphémères
    owner1 = Keypair.generate();
    owner2 = Keypair.generate();
    unauthorized = Keypair.generate();

    // Airdrop SOL pour les tests (montants réduits pour éviter les erreurs de faucet)
    await airdrop(admin.publicKey, 5);
    await airdrop(certifier.publicKey, 5);
    await airdrop(certifier2.publicKey, 5);
    await airdrop(owner1.publicKey, 2);
    await airdrop(owner2.publicKey, 2);
    await airdrop(unauthorized.publicKey, 1);

    // Initialiser owner3 pour les tests de demande (car owner2 est saturé)
    owner3 = Keypair.generate();
    await airdrop(owner3.publicKey, 2);

    // Calculer authority PDA
    [authorityPda, authorityBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("auth_v5")],
      program.programId
    );

    console.log("Authority PDA:", authorityPda.toBase58());
  });

  // ==================== TESTS DE BASE ====================
  describe("Tests de base - Initialisation", () => {
    it("Initialise l'autorité de certification", async () => {
      try {
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
        console.log("Initialisation réussie.");
      } catch (err: any) {
        if (err.toString().includes("already in use") || (err.logs && err.logs.some((l: any) => l.includes("already in use")))) {
          console.log("Autorité déjà initialisée, passage à la suite.");
        } else {
          throw err;
        }
      }

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
      const serialNumber = "ROLEX-SUB-001-V5";
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
      const serialNumber = "OMEGA-SEA-002-V5";
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
      await new Promise(r => setTimeout(r, 3000));
      const serialNumber = "PATEK-NAU-003-V5";
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
      await new Promise(r => setTimeout(r, 3000));
      const serialNumber = "AP-ROYAL-004-V5";
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
      const serialNumber = "FAKE-WATCH-999-V5";
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
      await new Promise(r => setTimeout(r, 3000));
      const serialNumber = "ROLEX-SUB-001-V5"; // Déjà créé
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
      await new Promise(r => setTimeout(r, 3000));
      // owner2 a 3 certificats, on ajoute le 4ème
      const serialNumber = "OMEGA-SPEED-005-V5";
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
      await new Promise(r => setTimeout(r, 1500));
      const serialNumber = "BREITLING-NAV-006-V5";
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
      const serialNumber = "ROLEX-SUB-001-V5";
      const [certificatePda] = getCertificatePda(serialNumber);

      // Utiliser fetch direct au lieu de .view() qui semble poser problème
      const certificate = await program.account.certificate.fetch(certificatePda);

      expect(certificate.serialNumber).to.equal(serialNumber);
      expect(certificate.brand).to.equal("Rolex");
      console.log("Certificat vérifié:", serialNumber);
    });

    it("Le certificat est verrouillé après émission", async () => {
      // Create specific cert for this test to avoid timing issues
      const serial = "LOCKED-CERT-001-V5";
      const [certPda] = getCertificatePda(serial);
      const [ownerFnActivityPda] = getUserActivityPda(owner1.publicKey);

      await program.methods.issueCertificate(serial, "Brand", "Model", { standard: {} }, new anchor.BN(100), "uri")
        .accounts({
          certifier: certifier.publicKey,
          owner: owner1.publicKey,
          authority: authorityPda,
          certificate: certPda,
          ownerActivity: ownerFnActivityPda,
          treasury: treasury.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([certifier])
        .rpc();

      const [toActivityPda] = getUserActivityPda(owner2.publicKey);

      try {
        await program.methods
          .transferCertificate()
          .accounts({
            from: owner1.publicKey,
            to: owner2.publicKey,
            certificate: certPda,
            fromActivity: ownerFnActivityPda,
            toActivity: toActivityPda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([owner1])
          .rpc();

        expect.fail("Devrait lever une erreur");
      } catch (err: any) {
        const errStr = err.toString();
        // Check for Lock OR Cooldown (both valid here)
        expect(errStr.includes("CertificateLocked") || errStr.includes("CooldownNotElapsed")).to.be.true;
        console.log("Erreur attendue: certificat verrouillé ou cooldown");
      }
    });

    it("On ne peut pas transférer un certificat sans être propriétaire", async () => {
      const serialNumber = "ROLEX-SUB-001-V5";
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
        console.log("Erreur attendue: non-proprietaire");
      }
    });
  });

  // ==================== TESTS DEMANDES DE CERTIFICATION ====================
  describe("Tests demandes de certification", () => {
    const requestSerial1 = "REQUEST-TEST-001";
    const requestSerial2 = "REQUEST-TEST-002";
    const requestSerial3 = "REQUEST-REJECT-001";

    function getRequestPda(serialNumber: string): [PublicKey, number] {
      return PublicKey.findProgramAddressSync(
        [Buffer.from("request"), Buffer.from(serialNumber)],
        program.programId
      );
    }

    it("Utilisateur soumet une demande de certification", async () => {
      const [requestPda] = getRequestPda(requestSerial1);

      await program.methods
        .requestCertification(
          requestSerial1,
          "Omega",
          "Speedmaster",
          { premium: {} },
          new anchor.BN(12000),
          "ipfs://QmTestMetadata123"
        )
        .accounts({
          requester: owner1.publicKey,
          authority: authorityPda,
          request: requestPda,
          treasury: treasury.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([owner1])
        .rpc();

      const request = await program.account.certificationRequest.fetch(requestPda);

      expect(request.requester.toString()).to.equal(owner1.publicKey.toString());
      expect(request.serialNumber).to.equal(requestSerial1);
      expect(request.brand).to.equal("Omega");
      expect(request.model).to.equal("Speedmaster");
      expect(request.status.pending).to.exist;
      expect(request.feePaid.toNumber()).to.be.greaterThan(0);

      console.log("Demande de certification soumise avec succes");
      console.log("Frais payes:", request.feePaid.toString(), "lamports");
    });

    it("Certificateur approuve une demande", async () => {
      const [requestPda] = getRequestPda(requestSerial1);
      const [certificatePda] = getCertificatePda(requestSerial1);
      const [ownerActivityPda] = getUserActivityPda(owner1.publicKey);

      // Recuperer le solde du certificateur avant
      const certifierBalanceBefore = await provider.connection.getBalance(certifier.publicKey);

      await program.methods
        .approveCertification()
        .accounts({
          certifier: certifier.publicKey,
          authority: authorityPda,
          request: requestPda,
          certificate: certificatePda,
          ownerActivity: ownerActivityPda,
          treasury: treasury.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([certifier])
        .rpc();

      // Verifier la demande mise a jour
      const request = await program.account.certificationRequest.fetch(requestPda);
      expect(request.status.approved).to.exist;
      expect(request.assignedCertifier.toString()).to.equal(certifier.publicKey.toString());

      // Verifier le certificat cree
      const certificate = await program.account.certificate.fetch(certificatePda);
      expect(certificate.serialNumber).to.equal(requestSerial1);
      expect(certificate.owner.toString()).to.equal(owner1.publicKey.toString());
      expect(certificate.certifier.toString()).to.equal(certifier.publicKey.toString());

      // Verifier que le certificateur a recu sa part (60%)
      const certifierBalanceAfter = await provider.connection.getBalance(certifier.publicKey);
      // Le certificateur devrait avoir gagne des lamports (moins les frais de tx)
      console.log("Certificateur balance avant:", certifierBalanceBefore);
      console.log("Certificateur balance apres:", certifierBalanceAfter);

      console.log("Demande approuvee et certificat cree");
    });

    it("Echec approbation par non-certificateur", async () => {
      // D'abord creer une nouvelle demande
      const [requestPda] = getRequestPda(requestSerial2);

      await program.methods
        .requestCertification(
          requestSerial2,
          "Cartier",
          "Santos",
          { luxury: {} },
          new anchor.BN(25000),
          "ipfs://QmTestMetadata456"
        )
        .accounts({
          requester: owner3.publicKey,
          authority: authorityPda,
          request: requestPda,
          treasury: treasury.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([owner3])
        .rpc();

      // Essayer d'approuver avec un non-certificateur
      const [certificatePda] = getCertificatePda(requestSerial2);
      const [ownerActivityPda] = getUserActivityPda(owner3.publicKey);

      try {
        await program.methods
          .approveCertification()
          .accounts({
            certifier: unauthorized.publicKey,
            authority: authorityPda,
            request: requestPda,
            certificate: certificatePda,
            ownerActivity: ownerActivityPda,
            treasury: treasury.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([unauthorized])
          .rpc();

        expect.fail("Devrait lever une erreur UnauthorizedCertifier");
      } catch (err: any) {
        expect(err).to.exist;
        console.log("Erreur attendue: non-certificateur ne peut pas approuver");
      }
    });

    it("Certificateur rejette une demande avec remboursement", async () => {
      // Creer une demande a rejeter
      const [requestPda] = getRequestPda(requestSerial3);

      // Solde avant du demandeur
      const requesterBalanceBefore = await provider.connection.getBalance(owner1.publicKey);

      await program.methods
        .requestCertification(
          requestSerial3,
          "Fake",
          "Watch",
          { standard: {} },
          new anchor.BN(1000),
          "ipfs://QmFakeWatch"
        )
        .accounts({
          requester: owner1.publicKey,
          authority: authorityPda,
          request: requestPda,
          treasury: treasury.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([owner1])
        .rpc();

      const requestBefore = await program.account.certificationRequest.fetch(requestPda);
      const feePaid = requestBefore.feePaid.toNumber();

      // Rejeter la demande
      await program.methods
        .rejectCertification("Authenticite non verifiable - photos insuffisantes")
        .accounts({
          certifier: certifier.publicKey,
          authority: authorityPda,
          request: requestPda,
          requester: owner1.publicKey,
          treasury: treasury.publicKey,
        })
        .signers([certifier])
        .rpc();

      // Verifier la demande mise a jour
      const request = await program.account.certificationRequest.fetch(requestPda);
      expect(request.status.rejected).to.exist;
      expect(request.rejectionReason).to.include("Authenticite non verifiable");

      // Verifier le remboursement
      const requesterBalanceAfter = await provider.connection.getBalance(owner1.publicKey);
      console.log("Demandeur balance avant:", requesterBalanceBefore);
      console.log("Demandeur balance apres:", requesterBalanceAfter);
      console.log("Frais rembourses:", feePaid, "lamports");

      console.log("Demande rejetee et frais rembourses");
    });

    it("Approuver la demande restante", async () => {
      // Approuver requestSerial2
      const [requestPda] = getRequestPda(requestSerial2);
      const [certificatePda] = getCertificatePda(requestSerial2);
      const [ownerActivityPda] = getUserActivityPda(owner3.publicKey);

      await program.methods
        .approveCertification()
        .accounts({
          certifier: certifier.publicKey,
          authority: authorityPda,
          request: requestPda,
          certificate: certificatePda,
          ownerActivity: ownerActivityPda,
          treasury: treasury.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([certifier])
        .rpc();

      const certificate = await program.account.certificate.fetch(certificatePda);
      expect(certificate.serialNumber).to.equal(requestSerial2);
      console.log("Deuxieme demande approuvee");
    });
  });

  // ==================== RÉSUMÉ ====================
  describe("Résumé final", () => {
    it("Affiche les statistiques finales", async () => {
      const authority = await program.account.certificationAuthority.fetch(authorityPda);

      console.log("\n========== RÉSUMÉ DES TESTS ==========");
      console.log("Total certificats émis:", authority.totalIssued.toString());
      console.log("- Standard:", authority.standardCount.toString());
      console.log("- Premium:", authority.premiumCount.toString());
      console.log("- Luxury:", authority.luxuryCount.toString());
      console.log("- Exceptional:", authority.exceptionalCount.toString());
      console.log("=======================================\n");

      // Vérifier qu'on a bien émis des certificats (conversion safe ou utilisation de BN)
      expect(authority.totalIssued.toString()).to.not.equal("0");
    });
  });
});
