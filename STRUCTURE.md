# Structure du projet SolCertify

Ce document explique l'organisation du projet apres la restructuration.

## Vue d'ensemble

Le projet est organise en 3 services independants:

```text
solcertify-solana/
├── backend/           # Smart contract Solana (Rust/Anchor)
├── frontend/          # Application React (TypeScript)
└── ipfs-service/      # Service IPFS (Node.js)
```

## Backend (Smart Contract)

Localisation: `./backend/`

Technologies: Rust, Anchor Framework 0.30.1, Solana 1.18.26

Statut: Complet (18/18 tests passants)

Contient:

- `programs/solcertify/src/` - Code du smart contract
  - `lib.rs` - Point d'entree du programme
  - `state/` - Structures de donnees on-chain (Authority, Certificate, UserActivity)
  - `processor/` - Logique metier (6 Instructions)
  - `errors/` - 14 codes d'erreur personnalises
- `tests/` - Tests unitaires en TypeScript
- `Anchor.toml` - Configuration Anchor
- `Cargo.toml` - Configuration Rust/Cargo

Commandes:

```bash
cd backend
cargo build-bpf --manifest-path programs/solcertify/Cargo.toml  # Compiler
anchor deploy                                                     # Deployer
npx mocha tests_js/solcertify.js --timeout 1000000               # Tester
```

Fichiers generes:

- `target/deploy/solcertify.so` - Programme compile
- `target/idl/solcertify.json` - IDL pour le frontend

## Frontend (React)

Localisation: `./frontend/`

Technologies: React 18, TypeScript, Vite, TailwindCSS

Statut: Phase 5 complete

Contient:

- `src/` - Code source React
  - `components/` - Composants UI
    - `Navbar.tsx` - Navigation avec wallet
    - `AuthorityInfo.tsx` - Statistiques globales
    - `VerifyWatch.tsx` - Verification d'authenticite
    - `UserCertificates.tsx` - Collection personnelle
    - `IssueCertificateForm.tsx` - Emission de certificats
  - `hooks/` - Custom hooks
    - `useSolCertify.ts` - Interaction avec le smart contract
  - `idl/` - IDL du programme
- `package.json` - Dependances npm
- `tailwind.config.js` - Theme Luxury (or/sombre)

Commandes:

```bash
cd frontend
npm install     # Installer
npm run dev     # Developpement (localhost:5173)
npm run build   # Production
```

Variables d'environnement (.env.local):

- `VITE_SOLANA_RPC_URL` - URL du RPC Solana (default: <http://localhost:8899>)
- `VITE_PROGRAM_ID` - ID du programme

## IPFS Service (Node.js)

Localisation: `./ipfs-service/`

Technologies: Node.js, Express, Pinata SDK

Statut: Complet

Contient:

- `server.js` - Serveur Express
- `package.json` - Dependances npm

Commandes:

```bash
cd ipfs-service
npm install     # Installer
npm start       # Demarrer
```

Variables d'environnement (.env):

- `PINATA_JWT` - JWT Token Pinata
- `PINATA_GATEWAY` - Gateway Pinata
- `PORT` - Port du serveur (3001)

Endpoints:

- `GET /health` - Health check
- `POST /api/upload/image` - Upload d'image
- `POST /api/metadata/create` - Creation de metadonnees
- `POST /api/certificate/full` - Certificat complet

## Docker

Localisation: `./docker/`

Statut: A finaliser (Phase 6)

Fichiers:

- `Dockerfile.backend` - Image pour le backend Solana
- `Dockerfile.frontend` - Image pour l'app React
- `Dockerfile.ipfs` - Image pour le service IPFS
- `docker-compose.yml` - Orchestration des services

Commandes:

```bash
# Demarrer tous les services
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Arreter
docker-compose down
```

Services exposes:

- Backend: `localhost:8899` (RPC Solana)
- Frontend: `localhost:5173` (Vite)
- IPFS: `localhost:3001` (API)

## Documentation

A la racine:

- `README.md` - Documentation principale
- `CLAUDE.md` - Instructions de developpement (prive)
- `SPECIFICATION.md` - Specifications completes (prive)
- `PHASES.md` - Plan de developpement (prive)
- `DOCKER.md` - Guide Docker (prive)
- `.env.example` - Template des variables d'environnement

Par service:

- `backend/README.md` - Documentation backend
- `frontend/README.md` - Documentation frontend
- `ipfs-service/README.md` - Documentation IPFS

## Avantages de cette structure

1. Separation claire - Chaque service est independant
2. Scalabilite - Facile d'ajouter de nouveaux services
3. Docker-ready - Chaque service a son propre container
4. Maintenance - Facile de travailler sur une partie sans affecter les autres
5. Git - Possibilite de faire des sous-modules si necessaire
6. CI/CD - Plus facile de mettre en place des pipelines par service

## Workflow de developpement

1. Backend d'abord: Developper et tester le smart contract
2. Frontend: Construire l'interface une fois le backend stable
3. Service IPFS: Implementer l'API de stockage
4. Docker: Conteneurisation finale

## Phase actuelle

- Phase 1: Restructuration complete
- Phase 2: Implementation du smart contract
- Phase 3: Finalisation Backend et Tests complets (18/18 Passing)
- Phase 4: Service IPFS
- Phase 5: Frontend React + Wallet Integration
- Phase 6: Docker et Deploiement (A faire)
