# Frontend - Application React

Interface utilisateur pour SolCertify construite avec React, Vite et TailwindCSS.

## Statut

Phase 5 Complete - Frontend fonctionnel avec wallet integration.

## Structure

```text
frontend/
├── src/
│   ├── components/
│   │   ├── Navbar.tsx           # Navigation + wallet button
│   │   ├── AuthorityInfo.tsx    # Statistiques globales
│   │   ├── VerifyWatch.tsx      # Verification d'authenticite
│   │   ├── UserCertificates.tsx # Collection personnelle
│   │   └── IssueCertificateForm.tsx # Emission (certificateurs)
│   ├── hooks/
│   │   └── useSolCertify.ts     # Hook d'interaction Anchor
│   ├── idl/
│   │   └── solcertify.json      # IDL du programme
│   ├── App.tsx                  # Layout principal avec tabs
│   ├── main.tsx                 # Entry point + providers
│   └── index.css                # Styles Tailwind + custom
├── tailwind.config.js           # Theme Luxury (or/sombre)
├── postcss.config.js            # PostCSS config
├── vite.config.ts               # Vite + polyfills Buffer
└── package.json                 # Dependances
```

## Commandes

```bash
# Installer les dependances
npm install

# Lancer le serveur de developpement
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
- @solana/wallet-adapter (Phantom, Solflare)
- @coral-xyz/anchor

## Variables d'environnement

Creer un fichier `.env.local`:

```env
VITE_SOLANA_RPC_URL=http://localhost:8899
VITE_PROGRAM_ID=FGgYzSL6kTGm2D9UZPCtoGZZykiHZKWUnAUxZiPeXEee
VITE_IPFS_API_URL=http://localhost:3001
```

## Fonctionnalites

- Verification publique par numero de serie
- Affichage des certificats personnels
- Formulaire d'emission pour certificateurs
- Statistiques globales du registre
- Design Luxury (theme sombre + accents dores)
- Integration wallet Phantom/Solflare
