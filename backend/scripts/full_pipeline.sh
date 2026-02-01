#!/bin/bash
# SolCertify - Pipeline Complet de Build & Test
# Exécutez ceci depuis le dossier backend

set -e # Arrêt en cas d'erreur

echo "============================================"
echo "  SolCertify - Pipeline Complet de Build  "
echo "============================================"

# Fonction pour démarrer le validateur
start_validator() {
    echo "Démarrage d'un validateur frais..."
    rm -rf test-ledger
    
    # Démarrer le validateur en arrière-plan ou nouveau terminal
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal -- bash -c "cd $(pwd) && solana-test-validator; exec bash" &
    elif command -v xterm &> /dev/null; then
        xterm -e "cd $(pwd) && solana-test-validator" &
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        osascript -e "tell application \"Terminal\" to do script \"cd $(pwd) && solana-test-validator\""
    else
        solana-test-validator &
    fi
    
    echo "Attente de 10 secondes pour le démarrage du validateur..."
    sleep 10
}

# Fonction pour arrêter le validateur
stop_validator() {
    echo "Arrêt du validateur..."
    pkill -f solana-test-validator || true
    sleep 2
}

# Configurer l'URL du provider
export ANCHOR_PROVIDER_URL="http://127.0.0.1:8899"

# ============================================
# PHASE 1: Build & Test
# ============================================
echo ""
echo "========== PHASE 1: BUILD & TEST =========="

# Étape 1: Démarrer un validateur propre
echo ""
echo "[1/10] Démarrage du validateur pour les tests..."
stop_validator
start_validator

# Étape 2: Compiler le programme Solana
echo ""
echo "[2/10] Compilation du programme Solana..."
cargo build-bpf --manifest-path programs/solcertify/Cargo.toml
echo "Compilation réussie !"

# Étape 3: Déployer sur le validateur local
echo ""
echo "[3/10] Déploiement sur le validateur local..."
anchor deploy
echo "Déploiement réussi !"

# Étape 4: Synchroniser l'IDL vers le frontend
echo ""
echo "[4/10] Synchronisation de l'IDL vers le frontend..."
cp target/idl/solcertify.json ../frontend/src/idl/solcertify.json
echo "IDL synchronisé !"

# Étape 5: Générer les paires de clés depuis .env
echo ""
echo "[5/10] Génération des clés depuis .env..."
npx ts-node scripts/generate_keypairs.ts
echo "Clés prêtes !"

# Étape 6: Compiler et exécuter les tests
echo ""
echo "[6/10] Compilation et exécution des tests..."
npx tsc tests/solcertify.ts --outDir tests_js --target es2020 --module commonjs --skipLibCheck --esModuleInterop

export ANCHOR_WALLET="$HOME/.config/solana/id.json"
npx mocha tests_js/solcertify.js --timeout 1000000

echo ""
echo "Tests terminés !"

# ============================================
# PHASE 2: Configuration pour le Frontend
# ============================================
echo ""
echo "========== PHASE 2: CONFIGURATION FRONTEND =========="

# Étape 7: Réinitialiser le validateur pour avoir un état propre
echo ""
echo "[7/10] Réinitialisation du validateur pour le frontend..."
stop_validator
start_validator

# Étape 8: Redéployer le programme
echo ""
echo "[8/10] Redéploiement du programme..."
anchor deploy
echo "Déploiement réussi !"

# Étape 9: Exécuter setup_dev (initialiser avec VOS clés)
echo ""
echo "[9/10] Exécution de setup_dev.ts..."
export ANCHOR_WALLET="tests/keypairs/admin.json"
npx ts-node scripts/setup_dev.ts
echo "Configuration terminée !"

# Étape 10: Financer les wallets
echo ""
echo "[10/10] Vérification et financement des wallets..."
npx ts-node scripts/check_balances.ts
echo "Wallets financés !"

echo ""
echo "============================================"
echo "  Pipeline Terminé !                        "
echo "  Le validateur tourne avec vos wallets.    "
echo "  Frontend prêt sur http://localhost:5173   "
echo "============================================"
