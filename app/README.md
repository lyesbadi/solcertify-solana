# DecentraVote - Frontend React

Interface utilisateur pour le système de vote décentralisé DecentraVote.

## Quick Start

```bash
# Installation des dépendances
npm install

# Lancement du serveur de développement
npm run dev

# Ouvrez http://localhost:5173
```

## Prérequis

1. **Node.js** >= 18.0
2. **Wallet Phantom** installé dans le navigateur
3. **Programme déployé** sur localnet ou devnet

## Configuration

### 1. Mettez à jour le Program ID

Après `anchor build`, récupérez votre Program ID et mettez-le à jour dans:

```typescript
// src/utils/program.ts
export const PROGRAM_ID = new PublicKey('VOTRE_PROGRAM_ID')
```

### 2. Configurez le réseau

Par défaut, l'app se connecte à `localhost:8899`.

Pour devnet, modifiez `src/main.tsx`:

```typescript
const network = clusterApiUrl('devnet')
```

## Structure

```
app/
├── src/
│   ├── main.tsx          # Point d'entrée
│   ├── App.tsx           # Composant principal
│   ├── index.css         # Styles globaux
│   ├── components/
│   │   ├── ProposeLaw.tsx   # Formulaire proposition
│   │   ├── VoteOnLaw.tsx    # Interface de vote
│   │   └── Results.tsx      # Affichage résultats
│   └── utils/
│       └── program.ts       # Utilitaires Anchor
├── index.html
└── package.json
```

## Fonctionnalités

- Connexion wallet Phantom
- Création de propositions
- Vote (Approve/Reject)
- Affichage temps réel
- Finalisation des propositions
- Design responsive

## Scripts

```bash
npm run dev      # Serveur de développement
npm run build    # Build de production
npm run preview  # Prévisualisation build
```
