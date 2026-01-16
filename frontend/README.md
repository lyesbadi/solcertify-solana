# Frontend - Application React

Interface utilisateur pour SolCertify construite avec React, Vite et TailwindCSS.

## Structure

```
frontend/
├── src/
│   ├── components/      # Composants React
│   ├── hooks/           # Custom hooks
│   ├── utils/           # Utilitaires
│   ├── App.tsx          # Composant principal
│   └── main.tsx         # Point d'entrée
├── package.json
└── vite.config.ts
```

## Commandes

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev

# Build pour production
npm run build

# Preview du build
npm run preview
```

## Technologies

- React 18
- TypeScript
- Vite
- TailwindCSS
- @solana/wallet-adapter
- @coral-xyz/anchor

## Variables d'environnement

Créer un fichier `.env.local`:

```env
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
VITE_PROGRAM_ID=FspmA7UoptTCbR1oq1Rd5iHg737gTeKCRfZwfJtj7Fjb
VITE_IPFS_API_URL=http://localhost:3001
```

## Phase actuelle

Phase 5 ⏳ - Développement du frontend (à la fin du projet)
