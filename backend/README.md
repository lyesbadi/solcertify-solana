# SolCertify

Smart Contract pour la certification d'authenticité de montres de luxe sur Solana, construit avec Anchor Framework.

## État du Projet

**Phase 3 Terminée** : Le backend est complet, fonctionnel et testé à 100%.

- Toutes les instructions (Initialize, Issue, Transfer, Security) sont implémentées.
- Tests d'intégration robustes avec persistance d'état.

## Pré-requis Système

Ce projet a été stabilisé avec la configuration suivante. L'utilisation d'autres versions peut entraîner des erreurs de compilation (notamment l'enfer des dépendances `anchor-lang` vs `solana-program`).

- **OS**: Windows (Supporté avec workaround), MacOS/Linux (Recommandé)
- **Solana CLI**: `v1.18.26` (Recommandé pour compatibilité BPF)
- **Rust**: `v1.75.0` (Aligné avec la toolchain Solana)
- **Anchor CLI**: `v0.30.1`
- **Node.js**: `v18+`

## Installation & Configuration

1. **Installer les dépendances Node**

   ```bash
   npm install
   ```

   *Note: Installe `dotenv` pour la gestion des clés persistantes.*

2. **Configurer l'environnement (.env)**
   Créez un fichier `.env` à la racine `backend/` pour définir les chemins de vos keypairs de test. Cela permet de garder les mêmes comptes (Admin, Treasury) entre chaque exécution de test, indispensable pour éviter les erreurs de state ("Already in use") sur un validateur local persistant.

   Exemple de `.env` :

   ```env
   ADMIN_KEYPAIR=./tests/keypairs/admin.json
   TREASURY_KEYPAIR=./tests/keypairs/treasury.json
   CERTIFIER_KEYPAIR=./tests/keypairs/certifier.json
   CERTIFIER2_KEYPAIR=./tests/keypairs/certifier2.json
   ```

## ompilation (Attention Windows !)

Sur certains environnements Windows, la commande standard `anchor build` peut échouer avec une erreur `Failed to install platform-tools: Accès refusé (os error 5)`.

**Solution de contournement (Workaround) :**
Utilisez directement le compilateur Solana BPF/SBF :

```bash
cargo build-sbf --manifest-path programs/solcertify/Cargo.toml
# OU (si sbf n'est pas dans le PATH)
cargo build-bpf --manifest-path programs/solcertify/Cargo.toml
```

Une fois compilé, déployez normalement :

```bash
anchor deploy
```

## Tests

Les tests sont écrits en TypeScript avec Mocha/Chai.
Pour une exécution robuste (sans recompiler à chaque fois via Anchor) :

1. **Lancer un validateur local** (dans un terminal séparé) :

   ```bash
   solana-test-validator
   ```

2. **Lancer les tests** :

   ```bash
   # Compiler les tests
   npx tsc tests/solcertify.ts --outDir tests_js --target es2020 --module commonjs --skipLibCheck --esModuleInterop

   # Configurer l'environnement (PowerShell)
   $env:ANCHOR_PROVIDER_URL="http://127.0.0.1:8899"
   $env:ANCHOR_WALLET="C:/Users/VOTRE_USER/.config/solana/id.json"

   # Exécuter
   npx mocha tests_js/solcertify.js --timeout 1000000
   ```

> **Note Developpeur :** Les constantes de temps dans `src/state/constants.rs` ont été réduites pour faciliter le dev :
>
> - Cooldown : 1 seconde (Prod: 5 min)
> - Lock : 20 secondes (Prod: 10 min)
> Pensez à remettre les valeurs de production avant le mainnet.

## Structure du Code

- `programs/solcertify/src/lib.rs` : Point d'entrée, définition des instructions et des contextes.
- `programs/solcertify/src/processor/` : Logique métier détaillée pour chaque instruction.
- `programs/solcertify/src/state/` : Structures de données (Account structs) et constantes.
- `target/idl/solcertify.json` : Interface IDL générée (Source de vérité pour le Frontend).
- `tests/solcertify.ts` : Scénarios de tests complets couvrant tous les cas limites.
