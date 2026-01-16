#!/bin/bash
set -e

echo "Démarrage du backend Solana..."

# Démarrer le validateur Solana en arrière-plan
echo " Lancement du validateur Solana..."
solana-test-validator \
    --reset \
    --quiet \
    --ledger /tmp/test-ledger \
    --rpc-port 8899 \
    --faucet-port 9900 \
    &

VALIDATOR_PID=$!

# Attendre que le validateur soit prêt
echo " Attente du validateur..."
for i in {1..30}; do
    if solana cluster-version &>/dev/null; then
        echo " Validateur prêt!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo " Le validateur n'a pas démarré dans les temps"
        exit 1
    fi
    sleep 2
done

# Airdrop de SOL pour les tests
echo " Airdrop de SOL..."
BALANCE=$(solana balance 2>/dev/null | awk '{print $1}')
if (( $(echo "$BALANCE < 10" | bc -l) )); then
    solana airdrop 100 || echo " Airdrop échoué, continuons quand même"
fi

# Build du programme
echo " Compilation du programme Solana..."
cargo build-sbf -- --locked

# Deploy du programme
echo " Déploiement du programme..."
PROGRAM_ID=$(solana program deploy target/deploy/solcertify.so 2>&1 | grep "Program Id" | awk '{print $3}')
echo " Programme déployé: $PROGRAM_ID"

# Lancer les tests
echo " Lancement des tests..."
npx ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts || echo "⚠️ Certains tests ont échoué"

echo " Backend prêt! Validateur en cours d'exécution..."

# Garder le container actif
wait $VALIDATOR_PID
