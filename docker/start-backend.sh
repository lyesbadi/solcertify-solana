#!/bin/bash
# SolCertify - Docker Backend Startup Script
# Adapté de full_pipeline.sh pour fonctionner dans Docker

set -e

echo "============================================"
echo "  SolCertify - Docker Backend Starting...  "
echo "============================================"

export ANCHOR_PROVIDER_URL="http://127.0.0.1:8899"

# ============================================
# PHASE 1: Start Validator
# ============================================
echo ""
echo "[1/7] Démarrage du validateur Solana..."
solana-test-validator \
    --reset \
    --quiet \
    --ledger /tmp/test-ledger \
    --rpc-port 8899 \
    --faucet-port 9900 \
    &

VALIDATOR_PID=$!

# Attendre que le validateur soit prêt
echo "[2/7] Attente du validateur..."
for i in {1..30}; do
    if solana cluster-version &>/dev/null; then
        echo "✓ Validateur prêt!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "✗ Le validateur n'a pas démarré dans les temps"
        exit 1
    fi
    sleep 2
done

# ============================================
# PHASE 2: Build & Deploy
# ============================================
echo ""
echo "[3/7] Compilation du programme Solana..."
cargo build-bpf --manifest-path programs/solcertify/Cargo.toml
echo "✓ Compilation réussie!"

echo ""
echo "[4/7] Déploiement du programme..."
anchor deploy
echo "✓ Déploiement réussi!"

# ============================================
# PHASE 3: Setup & IDL
# ============================================
echo ""
echo "[5/7] Synchronisation de l'IDL..."
mkdir -p ../frontend/src/idl 2>/dev/null || true
cp target/idl/solcertify.json ../frontend/src/idl/solcertify.json 2>/dev/null || echo "⚠️ IDL sync skipped (frontend not mounted)"
echo "✓ IDL synchronisé!"

echo ""
echo "[6/7] Génération des keypairs..."
if [ -f scripts/generate_keypairs.ts ]; then
    npx ts-node scripts/generate_keypairs.ts
    echo "✓ Keypairs générés!"
else
    echo "⚠️ Script de génération non trouvé, skip..."
fi

echo ""
echo "[7/7] Configuration des wallets de dev..."
export ANCHOR_WALLET="$HOME/.config/solana/id.json"
if [ -f scripts/setup_dev.ts ]; then
    # Vérifier si les keypairs existent
    if [ -d tests/keypairs ]; then
        export ANCHOR_WALLET="tests/keypairs/admin.json"
    fi
    npx ts-node scripts/setup_dev.ts || echo "⚠️ Setup dev partiel"
    echo "✓ Setup dev terminé!"
else
    echo "⚠️ Script setup_dev non trouvé, skip..."
fi

# ============================================
# READY
# ============================================
echo ""
echo "============================================"
echo "  ✓ Backend Solana prêt!                   "
echo "  RPC: http://localhost:8899               "
echo "  WebSocket: ws://localhost:8900           "
echo "  Faucet: http://localhost:9900            "
echo "============================================"
echo ""
echo "Le validateur tourne en arrière-plan..."
echo ""

# Garder le container actif
wait $VALIDATOR_PID
