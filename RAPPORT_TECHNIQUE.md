# Rapport Technique - SolCertify

## Plateforme de Certification d'Authenticite pour Montres de Luxe sur Solana

**Projet Web3 - Developpement d'une DApp basee sur la Blockchain**

---

## Table des Matieres

1. [Presentation du Cas d'Usage](#1-presentation-du-cas-dusage)
2. [Architecture Technique](#2-architecture-technique)
3. [Respect des Contraintes Metiers](#3-respect-des-contraintes-metiers)
4. [Choix de Conception](#4-choix-de-conception)
5. [Structure des Donnees On-Chain](#5-structure-des-donnees-on-chain)
6. [Tests Unitaires](#6-tests-unitaires)
7. [Integration IPFS](#7-integration-ipfs)
8. [Securite](#8-securite)
9. [Guide de Deploiement](#9-guide-de-deploiement)

---

## 1. Presentation du Cas d'Usage

### 1.1 Problematique

Le marche des montres de luxe est confronte a un probleme majeur : la contrefacon. Selon les estimations, plus de 40 millions de fausses montres sont vendues chaque annee dans le monde. Les acheteurs n'ont aucun moyen fiable de verifier l'authenticite d'une montre sur le marche secondaire.

### 1.2 Solution Proposee

**SolCertify** est une plateforme decentralisee de certification d'authenticite pour montres de luxe. Elle permet :

- **Aux horlogers agrees** : D'emettre des certificats d'authenticite immuables sur la blockchain
- **Aux proprietaires** : De prouver l'authenticite de leur montre et de transferer la propriete
- **Aux acheteurs** : De verifier instantanement l'historique complet d'une montre

### 1.3 Justification de l'Utilisation de la Blockchain

| Probleme Traditionnel | Solution Blockchain |
|----------------------|---------------------|
| Certificats papier falsifiables | Certificats immuables on-chain |
| Historique de propriete opaque | Tracabilite complete des transferts |
| Verification lente et couteuse | Verification instantanee et gratuite |
| Dependance a une autorite centrale | Decentralisation et transparence |

---

## 2. Architecture Technique

### 2.1 Stack Technologique

```
┌─────────────────────────────────────────────────────────┐
│                      FRONTEND                           │
│  React 18 + TypeScript + Vite + TailwindCSS             │
│  @solana/wallet-adapter (Phantom, Solflare)             │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    IPFS SERVICE                         │
│  Node.js + Express + Pinata SDK                         │
│  Stockage decentralise des metadonnees                  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                  SOLANA BLOCKCHAIN                      │
│  Programme Anchor (Rust)                                │
│  PDAs pour certificats, profils, activite               │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Choix de Solana

Nous avons choisi **Solana** plutot qu'Ethereum pour les raisons suivantes :

| Critere | Solana | Ethereum |
|---------|--------|----------|
| Temps de transaction | ~400ms | ~12-15s |
| Cout de transaction | ~0.00025$ | ~2-50$ |
| TPS theorique | 65,000 | ~15-30 |
| Langage | Rust (performant) | Solidity |

Pour un cas d'usage de certification ou les transactions doivent etre rapides et peu couteuses, Solana est ideal.

---

## 3. Respect des Contraintes Metiers

### 3.1 Tokenisation des Ressources (Contrainte 1)

Les certificats sont tokenises avec **4 niveaux de certification** :

```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum CertificationType {
    Standard,     // Montres < 5,000 EUR
    Premium,      // Montres 5,000 - 15,000 EUR
    Luxury,       // Montres 15,000 - 50,000 EUR
    Exceptional,  // Montres > 50,000 EUR
}
```

Chaque niveau correspond a une categorie de valeur et determine les frais de certification.

### 3.2 Echanges de Tokens (Contrainte 2)

Le transfert de certificats est implemente via l'instruction `transfer_certificate` :

```rust
pub fn transfer_certificate(ctx: Context<TransferCertificate>) -> Result<()> {
    // Verification de propriete
    require!(ctx.accounts.from.key() == certificate.owner, ErrorCode::NotOwner);
    
    // Verification du lock
    require!(clock.unix_timestamp >= certificate.locked_until, ErrorCode::CertificateLocked);
    
    // Verification du cooldown
    require!(elapsed >= COOLDOWN_PERIOD, ErrorCode::CooldownNotElapsed);
    
    // Mise a jour de l'historique
    certificate.previous_owners.push(old_owner);
    certificate.owner = ctx.accounts.to.key();
    
    Ok(())
}
```

### 3.3 Limites de Possession (Contrainte 3)

Chaque utilisateur est limite a **4 certificats maximum** :

```rust
// backend/programs/solcertify/src/state/constants.rs
pub const MAX_CERTIFICATES: u8 = 4;

// Verification dans transfer_certificate.rs
require!(
    to_activity.certificate_count < MAX_CERTIFICATES,
    ErrorCode::MaxCertificatesReached
);
```

### 3.4 Contraintes Temporelles (Contrainte 4)

#### Cooldown (5 minutes en production)

```rust
pub const COOLDOWN_PERIOD: i64 = 300; // 5 minutes (1s en dev)

// Verification avant chaque action
if from_activity.last_action_at > 0 {
    let elapsed = clock.unix_timestamp - from_activity.last_action_at;
    require!(elapsed >= COOLDOWN_PERIOD, ErrorCode::CooldownNotElapsed);
}
```

#### Lock Temporaire (10 minutes en production)

```rust
pub const LOCK_PERIOD: i64 = 600; // 10 minutes (20s en dev)

// Application apres acquisition
certificate.locked_until = clock.unix_timestamp + LOCK_PERIOD;
```

### 3.5 Utilisation d'IPFS (Contrainte 5)

Les metadonnees sont stockees sur IPFS via Pinata :

```javascript
// ipfs-service/server.js
app.post('/api/upload/image', upload.single('file'), async (req, res) => {
    const result = await pinata.pinFileToIPFS(readableStream, {
        pinataMetadata: { name: filename }
    });
    res.json({
        success: true,
        hash: result.IpfsHash,
        uri: `ipfs://${result.IpfsHash}`
    });
});
```

### 3.6 Tests Unitaires Anchor (Contrainte 6)

**23 tests unitaires** couvrent l'ensemble des fonctionnalites :

```
Tests de base - Initialisation
  ✓ Initialise l'autorite de certification

Tests de base - Gestion des certificateurs
  ✓ Ajoute un certificateur agree
  ✓ Ajoute un deuxieme certificateur
  ✓ Retire un certificateur

Tests de base - Emission de certificats
  ✓ Emet un certificat de type Standard
  ✓ Emet un certificat de type Premium
  ✓ Emet un certificat de type Luxury
  ✓ Emet un certificat de type Exceptional

Tests de securite
  ✓ Un utilisateur non autorise ne peut pas ajouter de certificateur
  ✓ Un utilisateur non certifie ne peut pas emettre de certificat
  ✓ Impossible de creer deux certificats avec le meme numero de serie

Tests des contraintes
  ✓ Verifie la limite de 4 certificats par utilisateur
  ✓ Impossible de depasser 4 certificats (MaxCertificatesReached)
  ✓ Verifie qu'un certificateur ne peut pas etre ajoute en double

Tests d'integration
  ✓ Verifie un certificat existant
  ✓ Le certificat est verrouille apres emission
  ✓ On ne peut pas transferer un certificat sans etre proprietaire

Tests demandes de certification
  ✓ Utilisateur soumet une demande de certification
  ✓ Certificateur approuve une demande
  ✓ Echec approbation par non-certificateur
  ✓ Certificateur rejette une demande avec remboursement
  ✓ Approuver la demande restante

Resume final
  ✓ Affiche les statistiques finales
```

---

## 4. Choix de Conception

### 4.1 Architecture PDAs (Program Derived Addresses)

Nous utilisons des PDAs pour tous les comptes on-chain :

| PDA | Seeds | Usage |
|-----|-------|-------|
| `authority` | `["auth_v5"]` | Autorite centrale de certification |
| `certificate` | `["certificate", serial_number]` | Certificat individuel |
| `user_activity` | `["user_activity", user_pubkey]` | Suivi cooldown/compteur |
| `certifier_profile` | `["certifier_profile", certifier_pubkey]` | Profil certificateur |
| `request` | `["request", serial_number]` | Demande de certification |

### 4.2 Systeme de Demandes de Certification

Plutot qu'une emission directe, nous avons implemente un **workflow de demande** :

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   Demande │────▶│ Certificat  │
│  (Paiement) │     │  (Pending)  │     │  (Approuve) │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Rejet +   │
                    │ Remboursement│
                    └─────────────┘
```

### 4.3 Distribution des Frais

Les frais de certification sont distribues automatiquement :

- **60%** → Certificateur (remuneration du travail d'expertise)
- **40%** → Tresorerie plateforme (maintenance et developpement)

```rust
// approve_certification.rs
let certifier_share = (fee_paid * 60) / 100;
let platform_share = fee_paid - certifier_share;
```

### 4.4 Anti-Monopole des Certificateurs

Chaque certificateur a une **charge maximale de 10 demandes simultanees** :

```rust
pub const MAX_CONCURRENT_REQUESTS: u16 = 10;

// Verification lors de la demande
constraint = certifier_profile.current_load < MAX_CONCURRENT_REQUESTS 
    @ ErrorCode::CertifierAtCapacity
```

---

## 5. Structure des Donnees On-Chain

### 5.1 Format des Metadonnees (Conforme au Sujet)

```json
{
    "name": "Rolex Submariner Date",
    "description": "Certificat d'authenticite SolCertify",
    "image": "ipfs://QmXxxxx...",
    "attributes": [
        {"trait_type": "Brand", "value": "Rolex"},
        {"trait_type": "Model", "value": "Submariner Date"},
        {"trait_type": "Serial Number", "value": "ROLEX-SUB-123456"},
        {"trait_type": "Certification Type", "value": "Luxury"},
        {"trait_type": "Estimated Value", "value": "15000 EUR"}
    ],
    "properties": {
        "certifier": "5wGox...CertifierKey",
        "certifierName": "Horlogerie Paris",
        "certifierAddress": "123 Rue de la Paix, 75001 Paris"
    },
    "previousOwners": ["7xKHj...Owner1", "9aLmn...Owner2"],
    "createdAt": "2026-02-01T15:30:00Z",
    "lastTransferAt": "2026-02-01T16:00:00Z"
}
```

### 5.2 Structure Certificate (On-Chain)

```rust
#[account]
pub struct Certificate {
    pub serial_number: String,      // Numero de serie unique
    pub brand: String,              // Marque
    pub model: String,              // Modele
    pub cert_type: CertificationType, // Type de certification
    pub estimated_value: u64,       // Valeur estimee (EUR)
    pub metadata_uri: String,       // URI IPFS des metadonnees
    pub owner: Pubkey,              // Proprietaire actuel
    pub certifier: Pubkey,          // Certificateur emetteur
    pub created_at: i64,            // Timestamp creation
    pub last_transfer_at: i64,      // Timestamp dernier transfert
    pub locked_until: i64,          // Fin du lock temporaire
    pub previous_owners: Vec<Pubkey>, // Historique (max 20)
    pub bump: u8,                   // PDA bump
}
```

---

## 6. Tests Unitaires

### 6.1 Couverture des Tests

| Categorie | Tests | Couverture |
|-----------|-------|------------|
| Initialisation | 1 | 100% |
| Gestion certificateurs | 3 | 100% |
| Emission certificats | 4 | 100% |
| Securite | 3 | 100% |
| Contraintes metiers | 3 | 100% |
| Integration | 3 | 100% |
| Workflow demandes | 6 | 100% |
| **Total** | **23** | **100%** |

### 6.2 Execution des Tests

```bash
cd backend
npx tsc tests/solcertify.ts --outDir tests_js --target es2020 --module commonjs --skipLibCheck --esModuleInterop
npx mocha tests_js/solcertify.js --timeout 1000000
```

### 6.3 Exemple de Test (Limite de Possession)

```typescript
it("Impossible de depasser 4 certificats (MaxCertificatesReached)", async () => {
    const serialNumber = "BREITLING-NAV-006-V5";
    const [certificatePda] = getCertificatePda(serialNumber);
    const [ownerActivityPda] = getUserActivityPda(owner2.publicKey);

    try {
        await program.methods
            .issueCertificate(serialNumber, "Breitling", "Navitimer", { standard: {} }, new anchor.BN(4000), "ipfs://...")
            .accounts({...})
            .signers([certifier])
            .rpc();
        expect.fail("Devrait lever une erreur MaxCertificatesReached");
    } catch (err: any) {
        expect(err.toString()).to.include("MaxCertificatesReached");
    }
});
```

---

## 7. Integration IPFS

### 7.1 Service IPFS

Le service `ipfs-service` expose 3 endpoints :

| Endpoint | Methode | Description |
|----------|---------|-------------|
| `/api/upload/image` | POST | Upload image vers IPFS |
| `/api/metadata/create` | POST | Creation metadonnees JSON |
| `/api/certificate/full` | POST | Workflow complet (image + metadata) |

### 7.2 Workflow d'Upload

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│ IPFS Service│────▶│   Pinata    │
│  (FormData) │     │  (Node.js)  │     │   (IPFS)    │
└─────────────┘     └─────────────┘     └─────────────┘
       │                                       │
       │         ipfs://QmHash...              │
       │◀──────────────────────────────────────│
       │
       ▼
┌─────────────┐
│   Solana    │
│  (On-Chain) │
└─────────────┘
```

---

## 8. Securite

### 8.1 Controles d'Acces

```rust
// Seul l'admin peut ajouter des certificateurs
#[account(
    mut,
    constraint = admin.key() == authority.admin @ ErrorCode::UnauthorizedCertifier
)]
pub admin: Signer<'info>,

// Seul le proprietaire peut transferer
require!(
    ctx.accounts.from.key() == certificate.owner,
    ErrorCode::NotOwner
);

// Seul le certificateur assigne peut approuver/rejeter
constraint = request.assigned_certifier == certifier.key() 
    @ ErrorCode::NotAssignedCertifier
```

### 8.2 Codes d'Erreur

```rust
#[error_code]
pub enum ErrorCode {
    #[msg("Seul un certificateur agree peut effectuer cette action")]
    UnauthorizedCertifier,
    #[msg("Seul le proprietaire peut effectuer cette action")]
    NotOwner,
    #[msg("Le certificat est temporairement verrouille")]
    CertificateLocked,
    #[msg("Cooldown non ecoule entre deux actions")]
    CooldownNotElapsed,
    #[msg("Limite de 4 certificats atteinte")]
    MaxCertificatesReached,
    #[msg("Ce certificateur existe deja")]
    CertifierAlreadyExists,
    #[msg("Certificateur a capacite maximale")]
    CertifierAtCapacity,
    // ...
}
```

---

## 9. Guide de Deploiement

### 9.1 Pre-requis

- Solana CLI v1.18.26
- Anchor CLI v0.30.1
- Node.js v18+
- Rust v1.75.0

### 9.2 Lancement Automatique

```powershell
# Windows
.\start_all.ps1

# Linux/Mac
./start_all.sh
```

### 9.3 Lancement Manuel

```bash
# Terminal 1: Validateur
solana-test-validator -r

# Terminal 2: Backend
cd backend && anchor deploy && npx ts-node scripts/setup_dev.ts

# Terminal 3: IPFS
cd ipfs-service && npm start

# Terminal 4: Frontend
cd frontend && npm run dev
```

---

## Conclusion

SolCertify repond a l'ensemble des contraintes du projet Web3 :

| Contrainte | Implementation |
|------------|----------------|
| Tokenisation multi-niveaux | 4 types de certification |
| Echanges de tokens | transfer_certificate |
| Limite de possession (4) | MAX_CERTIFICATES |
| Cooldown (5 min) | COOLDOWN_PERIOD |
| Lock temporaire (10 min) | LOCK_PERIOD |
| IPFS pour metadonnees | Pinata integration |
| Tests unitaires Anchor | 23 tests (100%) |

Le projet propose une solution concrete a un probleme reel du marche des montres de luxe, en tirant parti des avantages de la blockchain Solana pour garantir transparence, immutabilite et tracabilite.

---

**Auteurs :** Lyes Chougar, Victor Perez, Bryan Cellier

**Repository :** <https://github.com/lyesbadi/solcertify-solana>

**Date :** Fevrier 2026
