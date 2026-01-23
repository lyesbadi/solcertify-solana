# SolCertify

Plateforme de certification d'authenticité pour montres de luxe sur la blockchain Solana.

## Statut du Projet

| Phase | Description | Statut |
| :--- | :--- | :--- |
| Phase 1 | Restructuration | Complet |
| Phase 2 | Smart Contract | Complet |
| Phase 3 | Tests Backend | 23/23 passants |
| Phase 4 | Service IPFS | Complet |
| Phase 5 | Frontend React | Complet (Dashboard & Request Form) |
| Phase 6 | Docker | A venir |

---

## Guide de Démarrage Rapide (Démo)

Suivez ces étapes pour lancer et tester le projet complet en local.

### 1. Lancer l'environnement

Ouvrez plusieurs terminaux :

**Terminal 1 : Validateur Solana (Blockchain Locale)**

```bash
# Reset pour partir sur une base propre (recommandé si bugs)
solana-test-validator -r
```

**Terminal 2 : Backend & Déploiement**

```bash
cd backend

# A. Compiler le programme
cargo build-bpf --manifest-path programs/solcertify/Cargo.toml

# B. Déployer le programme
anchor deploy

# C. Initialiser le programme (IMPORTANT)
# Cette étape lance les tests qui initialisent l'Admin et créent le fichier clé.
# Assurez-vous d'avoir installé les dépendances avant (npm install)
npx tsc tests/solcertify.ts --outDir tests_js --target es2020 --module commonjs --skipLibCheck --esModuleInterop
npx mocha tests_js/solcertify.js --timeout 1000000
```

*Note : Les tests génèrent un fichier clé Admin dans `backend/tests/keypairs/admin.json`. C'est cette clé qui est "Dieu" sur le contrat.*

**Terminal 3 : Service IPFS**

```bash
cd ipfs-service
npm install
npm start
```

*Le service tourne sur <http://localhost:3001>.*

**Terminal 4 : Frontend**

```bash
cd frontend
npm install
npm run dev
```

*L'app tourne sur <http://localhost:5173>.*

---

### 2. Configuration des Wallets (Phantom)

Pour tester tous les rôles (Admin, Certificateur, Client), utilisez l'extension **Phantom** configurée sur **Localhost**.

1. **Réseau** : Dans Phantom > Paramètres > Developer Settings > Change Network > **Localhost**.
2. **Compte Admin (Optionnel pour la démo)** :
    * Le script de test a initialisé le programme avec une clé spécifique.
    * Clé privée disponible ici : `backend/tests/keypairs/admin.json` (Ouvrez le fichier, copiez le tableau JSON `[12, 45...]`, Import Private Key dans Phantom).
3. **Compte Certificateur** :
    * Créez un nouveau compte dans Phantom ("Certificateur").
    * Copiez son adresse publique.
    * Financez-le : `solana airdrop 10 <ADRESSE>` (dans le terminal).
4. **Compte Client** :
    * Créez un nouveau compte ("Client").
    * Financez-le : `solana airdrop 10 <ADRESSE>`.

---

### 3. Donner le rôle "Certificateur" (Script)

Par défaut, le compte "Certificateur" est un utilisateur lambda. Pour qu'il accède au Dashboard de validation, l'Admin doit l'approuver.

Dans le terminal `backend` :

```powershell
$env:ANCHOR_PROVIDER_URL="http://127.0.0.1:8899"; $env:ANCHOR_WALLET="C:\Users\choug\.config\solana\id.json"; npx ts-node scripts/add-certifier.ts <ADRESSE_DU_CERTIFICATEUR>
```

*Ce script utilise automatiquement la clé `admin.json` générée par les tests pour signer la transaction.*

---

### 4. Scénario de Test Complet

1. **Demande (Rôle Client)**
    * Connectez le wallet **Client**.
    * Allez sur l'onglet **"Demander Certification"**.
    * Remplissez le formulaire (Marque, Modèle, Serial, Photo).
    * Envoyez la demande (Paiement des frais).
    * Vérifiez dans "Mes Montres" : La demande est "En attente".

2. **Approbation (Rôle Certificateur)**
    * Connectez le wallet **Certificateur**.
    * L'onglet devient **"Espace Certificateur"** (au lieu de Demander).
    * Vous voyez la demande dans le Dashboard.
    * Cliquez sur **"Approuver"**.
    * Validez la transaction.

3. **Réception (Rôle Client)**
    * Reconnectez le wallet **Client**.
    * Allez dans "Mes Montres".
    * 🎉 Le **Certificat Officiel** est là ! (Statut Transférable).
    * La demande "En attente" a disparu ou est passée en résolu.

---

## Structure du projet

```text
solcertify-solana/
├── backend/                    # Smart contracts Solana (Rust/Anchor)
│   ├── programs/solcertify/   # Code du programme
│   ├── tests/                 # Tests unitaires & Clés Admin
│   ├── scripts/               # Scripts utilitaires (add-certifier)
│   ├── Anchor.toml            # Configuration Anchor
│   └── Cargo.toml             # Configuration Rust
│
├── frontend/                   # Application React
│   ├── src/                   # Code source React
│   │   ├── components/        # Navbar, CertifierDashboard, RequestForm, etc.
│   │   ├── hooks/             # useSolCertify
│   │   └── idl/               # IDL du programme
│   ├── package.json           # Dependances npm
│   └── vite.config.ts         # Configuration Vite
│
├── ipfs-service/              # Service IPFS (Node.js)
│   ├── server.js              # API Express
│   └── package.json           # Dependances npm
```
