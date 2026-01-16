# SolCertify

Plateforme de certification d'authenticité pour montres de luxe sur la blockchain Solana.

## Structure du projet

```
solcertify-solana/
├── backend/                    # Smart contracts Solana (Rust/Anchor)
│   ├── programs/solcertify/   # Code du programme
│   ├── tests/                 # Tests unitaires
│   ├── Anchor.toml            # Configuration Anchor
│   └── Cargo.toml             # Configuration Rust
│
├── frontend/                   # Application React
│   ├── src/                   # Code source React
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

- 4 types de certification (Standard, Premium, Luxury, Exceptional)
- Certificateurs agréés uniquement
- Limite de 4 certificats par utilisateur
- Cooldown de 5 minutes entre transactions
- Lock de 10 minutes après acquisition
- Métadonnées stockées sur IPFS
- Paiement en SOL

## Installation

### Prérequis

- Node.js 18+
- Rust 1.75+
- Solana CLI 1.18.26
- Anchor CLI 0.30.1

### Backend (Solana)

```bash
cd backend
anchor build
anchor test
```

### Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

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

- **Blockchain**: Solana (Devnet/Mainnet)
- **Framework**: Anchor 0.30.1
- **Smart Contract**: Rust
- **Frontend**: React 18 + Vite + TailwindCSS
- **Storage**: IPFS via Pinata
- **Tests**: Anchor (TypeScript)
