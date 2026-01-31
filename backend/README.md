# SolCertify Backend

Smart Contract pour la certification d'authenticité de montres de luxe sur Solana, construit avec Anchor Framework.

## État du Projet

**Phase 4 Terminée** : Backend complet avec système de demandes de certification, gestion des certificateurs, et scripts de déploiement automatisés.

## Pré-requis Système

| Composant | Version Recommandée |
|-----------|---------------------|
| OS | Windows / MacOS / Linux |
| Solana CLI | v1.18.26 |
| Rust | v1.75.0 |
| Anchor CLI | v0.30.1 |
| Node.js | v18+ |

## Installation Rapide

```bash
npm install
```

## Configuration (.env)

Créez un fichier `.env` à la racine `backend/` avec vos clés de wallets :

```env
# Adresses publiques (remplacez par vos propres adresses Solana)
ADDRESS_DEMANDEUR=<votre_adresse_demandeur>
ADDRESS_ADMIN=<votre_adresse_admin>
ADDRESS_CERTIFICATEUR_1=<votre_adresse_certificateur_1>
ADDRESS_CERTIFICATEUR_2=<votre_adresse_certificateur_2>

# Clés privées Base58 (SENSIBLE - ne jamais partager)
ADDRESS_DEMANDEUR_PRVT=<votre_cle_privee_base58>
ADDRESS_ADMIN_PRVT=<votre_cle_privee_base58>
ADDRESS_CERTIFICATEUR_1_PRVT=<votre_cle_privee_base58>
ADDRESS_CERTIFICATEUR_2_PRVT=<votre_cle_privee_base58>
```

## Scripts Disponibles

### Pipeline Complet (Recommandé)

Le script `full_pipeline` automatise tout le processus en deux phases :

**Windows (PowerShell):**

```powershell
cd backend
.\scripts\full_pipeline.ps1
```

**Linux/Mac (Bash):**

```bash
cd backend
chmod +x scripts/full_pipeline.sh
./scripts/full_pipeline.sh
```

**Ce que fait le pipeline :**

| Phase | Étape | Description |
|-------|-------|-------------|
| **PHASE 1** | 1-6 | Build, Deploy, Tests sur validateur propre |
| **PHASE 2** | 7-10 | Reset validateur, Setup avec VOS wallets, Fund |

### Scripts Individuels

| Script | Commande | Description |
|--------|----------|-------------|
| `generate_keypairs.ts` | `npx ts-node scripts/generate_keypairs.ts` | Génère les JSON keypairs depuis `.env` |
| `setup_dev.ts` | `npx ts-node scripts/setup_dev.ts` | Initialise l'autorité + ajoute les certificateurs |
| `check_balances.ts` | `npx ts-node scripts/check_balances.ts` | Vérifie et funde les wallets (transfert depuis Admin) |

## Compilation Manuelle

Sur Windows, utilisez `cargo build-bpf` au lieu de `anchor build` :

```bash
cargo build-bpf --manifest-path programs/solcertify/Cargo.toml
anchor deploy
```

## Tests Manuels

Si vous voulez lancer les tests séparément :

```bash
# 1. Lancer le validateur (terminal séparé)
solana-test-validator

# 2. Compiler les tests
npx tsc tests/solcertify.ts --outDir tests_js --target es2020 --module commonjs --skipLibCheck --esModuleInterop

# 3. Configurer l'environnement (PowerShell)
$env:ANCHOR_PROVIDER_URL="http://127.0.0.1:8899"
$env:ANCHOR_WALLET="C:/Users/VOTRE_USER/.config/solana/id.json"

# 4. Exécuter
npx mocha tests_js/solcertify.js --timeout 1000000
```

## Structure du Code

```
backend/
├── programs/solcertify/src/
│   ├── lib.rs                 # Point d'entrée Anchor
│   ├── processor/             # Logique des instructions
│   │   ├── initialize.rs
│   │   ├── add_certifier.rs
│   │   ├── issue_certificate.rs
│   │   ├── request_certification.rs
│   │   ├── approve_certification.rs
│   │   ├── reject_certification.rs
│   │   └── ...
│   ├── state/                 # Structures de données
│   │   ├── mod.rs
│   │   ├── certificate.rs
│   │   ├── certifier_profile.rs
│   │   └── constants.rs
│   └── errors/                # Codes d'erreur
├── scripts/                   # Scripts de déploiement
│   ├── full_pipeline.ps1      # Pipeline Windows
│   ├── full_pipeline.sh       # Pipeline Linux/Mac
│   ├── setup_dev.ts
│   ├── check_balances.ts
│   └── generate_keypairs.ts
├── tests/
│   ├── solcertify.ts          # Tests d'intégration
│   └── keypairs/              # Keypairs générés
├── target/
│   └── idl/solcertify.json    # IDL (source de vérité Frontend)
└── .env                       # Configuration wallets
```

## Notes de Développement

> **Constantes de temps réduites pour le dev** (`src/state/constants.rs`) :
>
> - Cooldown : 1 seconde (Prod: 5 min)
> - Lock : 20 secondes (Prod: 10 min)
>
> Pensez à remettre les valeurs de production avant le mainnet.

## Workflow Frontend

Après le pipeline, le Frontend est prêt :

1. Les certificateurs sont enregistrés on-chain
2. Les wallets sont fundés
3. L'IDL est synchronisé dans `../frontend/src/idl/`
4. Lancez le frontend : `cd ../frontend && npm run dev`
