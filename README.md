# SolCertify

Plateforme de certification d'authenticité pour montres de luxe sur la blockchain Solana.

## Statut du Projet

| Phase | Description | Statut |
|-------|-------------|--------|
| Phase 1 | Restructuration |  Complet |
| Phase 2 | Smart Contract |  Complet |
| Phase 3 | Tests Backend |  18/18 passants |
| Phase 4 | Frontend React |  Complet |
| Phase 5 | Service IPFS |  En cours |
| Phase 6 | Docker |  À venir |

## Structure du projet

```text
solcertify-solana/
├── backend/                    # Smart contracts Solana (Rust/Anchor)
│   ├── programs/solcertify/   # Code du programme
│   ├── tests/                 # Tests unitaires
│   ├── Anchor.toml            # Configuration Anchor
│   └── Cargo.toml             # Configuration Rust
│
├── frontend/                   # Application React
│   ├── src/                   # Code source React
│   │   ├── components/        # Navbar, VerifyWatch, UserCertificates, etc.
│   │   ├── hooks/             # useSolCertify
│   │   └── idl/               # IDL du programme
│   ├── package.json           # Dépendances npm
│   └── vite.config.ts         # Configuration Vite
│
├── ipfs-service/              # Service IPFS (Node.js)
│   ├── server.js              # API Express
│   └── package.json           # Dépendances npm
│
├── docker/                    # Dockerfiles
│   ├── Dockerfile.backend     # Container Solana
│   ├── Dockerfile.frontend    # Container React
│   └── Dockerfile.ipfs        # Container IPFS
│
└── docker-compose.yml         # Orchestration
```

## Fonctionnalités

### Smart Contract (Solana)

- 6 Instructions : Initialize, AddCertifier, RemoveCertifier, IssueCertificate, TransferCertificate, VerifyCertificate
- 4 types de certification (Standard, Premium, Luxury, Exceptional)
- Certificateurs agréés uniquement (max 50)
- Limite de 4 certificats par utilisateur
- Cooldown de 5 minutes entre transactions
- Lock de 10 minutes après acquisition
- Paiement en SOL (0.05 - 0.5 SOL selon le type)

### Frontend (React)

- **Vérification publique** : Consulter l'authenticité par numéro de série
- **Wallet Integration** : Phantom & Solflare
- **Collection personnelle** : Voir ses certificats
- **Émission** : Interface pour les certificateurs agréés
- **Design Luxury** : Thème sombre avec accents dorés

## Installation

### Prérequis

- Node.js 18+
- Rust 1.75+
- Solana CLI 1.18.26
- Anchor CLI 0.30.1

### Backend (Solana)

> **Note** : Voir `backend/README.md` pour les instructions détaillées.

```bash
cd backend

# Démarrer le validateur local (Terminal 1)
solana-test-validator

# Build & Deploy (Terminal 2)
cargo build-bpf --manifest-path programs/solcertify/Cargo.toml
anchor deploy

# Tests
npx tsc tests/solcertify.ts --outDir tests_js --target es2020 --module commonjs --skipLibCheck --esModuleInterop
npx mocha tests_js/solcertify.js --timeout 1000000
```

### Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

Accéder à `http://localhost:5173`

### Service IPFS

```bash
cd ipfs-service
npm install
npm start
```

## Docker

Lancer tous les services avec Docker Compose:

```bash
# Copier le fichier .env
cp .env.example .env

# Configurer vos clés Pinata dans .env

# Démarrer les services
docker-compose up -d

# Voir les logs
docker-compose logs -f
```

## Technologies

- **Blockchain**: Solana (Localnet/Devnet/Mainnet)
- **Framework**: Anchor 0.30.1
- **Smart Contract**: Rust
- **Frontend**: React 18 + Vite + TailwindCSS
- **Wallet**: Phantom, Solflare
- **Storage**: IPFS via Pinata
- **Tests**: Mocha (TypeScript)

## Screenshots

La vérification d'authenticité fonctionne en temps réel depuis la blockchain :

- Rolex Submariner Date (Standard - 5 000 EUR)
- Omega Seamaster Diver 300M (Premium - 8 000 EUR)
- Patek Philippe Nautilus 5711 (Luxury - 50 000 EUR)

## Licence

MIT
