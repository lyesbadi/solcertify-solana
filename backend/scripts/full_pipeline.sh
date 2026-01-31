#!/bin/bash
# SolCertify - Full Build, Setup & Test Script
# Run this from the backend directory

set -e # Exit on error

echo "============================================"
echo "  SolCertify - Full Build & Test Pipeline  "
echo "============================================"

# Function to start validator
start_validator() {
    echo "Starting fresh validator..."
    rm -rf test-ledger
    
    # Start validator in background or new terminal
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal -- bash -c "cd $(pwd) && solana-test-validator; exec bash" &
    elif command -v xterm &> /dev/null; then
        xterm -e "cd $(pwd) && solana-test-validator" &
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        osascript -e "tell application \"Terminal\" to do script \"cd $(pwd) && solana-test-validator\""
    else
        solana-test-validator &
    fi
    
    echo "Waiting 10 seconds for validator to start..."
    sleep 10
}

# Function to stop validator
stop_validator() {
    echo "Stopping validator..."
    pkill -f solana-test-validator || true
    sleep 2
}

# Set environment variables
export ANCHOR_PROVIDER_URL="http://127.0.0.1:8899"

# ============================================
# PHASE 1: Build & Test
# ============================================
echo ""
echo "========== PHASE 1: BUILD & TEST =========="

# Step 1: Start fresh validator for tests
echo ""
echo "[1/10] Starting fresh validator for tests..."
stop_validator
start_validator

# Step 2: Build the Solana program
echo ""
echo "[2/10] Building Solana program..."
cargo build-bpf --manifest-path programs/solcertify/Cargo.toml
echo "Build successful!"

# Step 3: Deploy to local validator
echo ""
echo "[3/10] Deploying to local validator..."
anchor deploy
echo "Deploy successful!"

# Step 4: Sync IDL to frontend
echo ""
echo "[4/10] Syncing IDL to frontend..."
cp target/idl/solcertify.json ../frontend/src/idl/solcertify.json
echo "IDL synced!"

# Step 5: Generate keypairs from .env
echo ""
echo "[5/10] Generating keypairs from .env..."
npx ts-node scripts/generate_keypairs.ts
echo "Keypairs ready!"

# Step 6: Compile and run tests
echo ""
echo "[6/10] Compiling and running tests..."
npx tsc tests/solcertify.ts --outDir tests_js --target es2020 --module commonjs --skipLibCheck --esModuleInterop

export ANCHOR_WALLET="$HOME/.config/solana/id.json"
npx mocha tests_js/solcertify.js --timeout 1000000

echo ""
echo "Tests complete!"

# ============================================
# PHASE 2: Setup for Frontend
# ============================================
echo ""
echo "========== PHASE 2: FRONTEND SETUP =========="

# Step 7: Reset validator for clean frontend state
echo ""
echo "[7/10] Resetting validator for frontend..."
stop_validator
start_validator

# Step 8: Redeploy program
echo ""
echo "[8/10] Redeploying program..."
anchor deploy
echo "Deploy successful!"

# Step 9: Run setup_dev (initialize with YOUR keys)
echo ""
echo "[9/10] Running setup_dev.ts..."
export ANCHOR_WALLET="tests/keypairs/admin.json"
npx ts-node scripts/setup_dev.ts
echo "Setup complete!"

# Step 10: Fund wallets
echo ""
echo "[10/10] Checking and funding wallets..."
npx ts-node scripts/check_balances.ts
echo "Wallets funded!"

echo ""
echo "============================================"
echo "  Pipeline Complete!                        "
echo "  Validator is running with your wallets.   "
echo "  Frontend ready at http://localhost:5173   "
echo "============================================"
