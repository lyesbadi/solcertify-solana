# Structure du projet SolCertify

Ce document explique l'organisation du projet après la restructuration.

## Vue d'ensemble

Le projet est organisé en 3 services indépendants:

```
solcertify-solana/
├── backend/           # Smart contract Solana (Rust/Anchor)
├── frontend/          # Application React (TypeScript)
└── ipfs-service/      # Service IPFS (Node.js)
```

## Backend (Smart Contract)

**Localisation**: `./backend/`

**Technologies**: Rust, Anchor Framework, Solana

**Contient**:
- `programs/solcertify/src/` - Code du smart contract
  - `lib.rs` - Point d'entrée du programme
  - `state/` - Structures de données on-chain
  - `instructions/` - Logique métier (Phase 2)
  - `errors/` - Codes d'erreur personnalisés
- `tests/` - Tests unitaires en TypeScript
- `Anchor.toml` - Configuration Anchor
- `Cargo.toml` - Configuration Rust/Cargo

**Commandes**:
```bash
cd backend
anchor build    # Compiler
anchor test     # Tester
anchor deploy   # Déployer
```

**Fichiers générés**:
- `target/deploy/solcertify.so` - Programme compilé
- `target/idl/solcertify.json` - IDL pour le frontend

## Frontend (React)

**Localisation**: `./frontend/`

**Technologies**: React 18, TypeScript, Vite, TailwindCSS

**Contient**:
- `src/` - Code source React
  - `components/` - Composants UI
  - `hooks/` - Custom hooks
  - `utils/` - Utilitaires
- `package.json` - Dépendances npm

**Commandes**:
```bash
cd frontend
npm install     # Installer
npm run dev     # Développement
npm run build   # Production
```

**Variables d'environnement** (`.env.local`):
- `VITE_SOLANA_RPC_URL` - URL du RPC Solana
- `VITE_PROGRAM_ID` - ID du programme
- `VITE_IPFS_API_URL` - URL du service IPFS

## IPFS Service (Node.js)

**Localisation**: `./ipfs-service/`

**Technologies**: Node.js, Express, Pinata SDK

**Contient**:
- `server.js` - Serveur Express
- `package.json` - Dépendances npm

**Commandes**:
```bash
cd ipfs-service
npm install     # Installer
npm start       # Démarrer
```

**Variables d'environnement** (`.env`):
- `PINATA_API_KEY` - Clé API Pinata
- `PINATA_SECRET_KEY` - Clé secrète Pinata
- `PORT` - Port du serveur (3001)

**Endpoints**:
- `POST /api/upload/image` - Upload d'image
- `POST /api/metadata/create` - Création de métadonnées

## Docker

**Localisation**: `./docker/`

**Fichiers**:
- `Dockerfile.backend` - Image pour le backend Solana
- `Dockerfile.frontend` - Image pour l'app React
- `Dockerfile.ipfs` - Image pour le service IPFS
- `docker-compose.yml` - Orchestration des services

**Commandes**:
```bash
# Démarrer tous les services
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Arrêter
docker-compose down
```

**Services exposés**:
- Backend: `localhost:8899` (RPC Solana)
- Frontend: `localhost:5173` (Vite)
- IPFS: `localhost:3001` (API)

## Documentation

**À la racine**:
- `README.md` - Documentation principale
- `CLAUDE.md` - Instructions de développement (privé)
- `SPECIFICATION.md` - Spécifications complètes (privé)
- `PHASES.md` - Plan de développement (privé)
- `DOCKER.md` - Guide Docker (privé)
- `.env.example` - Template des variables d'environnement

**Par service**:
- `backend/README.md` - Documentation backend
- `frontend/README.md` - Documentation frontend
- `ipfs-service/README.md` - Documentation IPFS

## Avantages de cette structure

1. **Séparation claire** - Chaque service est indépendant
2. **Scalabilité** - Facile d'ajouter de nouveaux services
3. **Docker-ready** - Chaque service a son propre container
4. **Maintenance** - Facile de travailler sur une partie sans affecter les autres
5. **Git** - Possibilité de faire des sous-modules si nécessaire
6. **CI/CD** - Plus facile de mettre en place des pipelines par service

## Workflow de développement

1. **Backend d'abord**: Développer et tester le smart contract
2. **Service IPFS**: Implémenter l'API de stockage
3. **Frontend**: Construire l'interface une fois le backend stable

## Phase actuelle

✅ Phase 1: Restructuration complète
⏳ Phase 2: Implémentation des instructions du smart contract
