# SolCertify - Full Build, Setup & Test Script
# Run this from the backend directory

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  SolCertify - Full Build & Test Pipeline  " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# Function to start validator
function Start-Validator {
    Write-Host "Starting fresh validator..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force test-ledger -ErrorAction SilentlyContinue
    $script:validatorProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; solana-test-validator" -PassThru
    Write-Host "Waiting 10 seconds for validator to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
}

# Function to stop validator
function Stop-Validator {
    Write-Host "Stopping validator..." -ForegroundColor Yellow
    Get-Process -Name "solana-test-validator" -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Seconds 2
}

# Set environment variables
$env:ANCHOR_PROVIDER_URL = "http://127.0.0.1:8899"

# ============================================
# PHASE 1: Build & Test
# ============================================
Write-Host "`n========== PHASE 1: BUILD & TEST ==========" -ForegroundColor Magenta

# Step 0: Start fresh validator
Write-Host "`n[1/10] Starting fresh validator for tests..." -ForegroundColor Yellow
Stop-Validator
Start-Validator

# Step 1: Build the Solana program
Write-Host "`n[2/10] Building Solana program..." -ForegroundColor Yellow
cargo build-bpf --manifest-path programs/solcertify/Cargo.toml
if ($LASTEXITCODE -ne 0) {
    Write-Host "BUILD FAILED!" -ForegroundColor Red
    exit 1
}
Write-Host "Build successful!" -ForegroundColor Green

# Step 2: Deploy to local validator
Write-Host "`n[3/10] Deploying to local validator..." -ForegroundColor Yellow
anchor deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "DEPLOY FAILED!" -ForegroundColor Red
    exit 1
}
Write-Host "Deploy successful!" -ForegroundColor Green

# Step 3: Sync IDL to frontend
Write-Host "`n[4/10] Syncing IDL to frontend..." -ForegroundColor Yellow
Copy-Item -Path "target/idl/solcertify.json" -Destination "../frontend/src/idl/solcertify.json" -Force
Write-Host "IDL synced!" -ForegroundColor Green

# Step 4: Generate keypairs from .env
Write-Host "`n[5/10] Generating keypairs from .env..." -ForegroundColor Yellow
npx ts-node scripts/generate_keypairs.ts
Write-Host "Keypairs ready!" -ForegroundColor Green

# Step 5: Compile and run tests
Write-Host "`n[6/10] Compiling and running tests..." -ForegroundColor Yellow
npx tsc tests/solcertify.ts --outDir tests_js --target es2020 --module commonjs --skipLibCheck --esModuleInterop
if ($LASTEXITCODE -ne 0) {
    Write-Host "TSC COMPILATION FAILED!" -ForegroundColor Red
    exit 1
}

$env:ANCHOR_WALLET = "C:/Users/choug/.config/solana/id.json"
npx mocha tests_js/solcertify.js --timeout 1000000

Write-Host "`nTests complete!" -ForegroundColor Green

# ============================================
# PHASE 2: Setup for Frontend
# ============================================
Write-Host "`n========== PHASE 2: FRONTEND SETUP ==========" -ForegroundColor Magenta

# Step 6: Reset validator for clean frontend state
Write-Host "`n[7/10] Resetting validator for frontend..." -ForegroundColor Yellow
Stop-Validator
Start-Validator

# Step 7: Redeploy program
Write-Host "`n[8/10] Redeploying program..." -ForegroundColor Yellow
anchor deploy
Write-Host "Deploy successful!" -ForegroundColor Green

# Step 8: Run setup_dev (initialize with YOUR keys)
Write-Host "`n[9/10] Running setup_dev.ts..." -ForegroundColor Yellow
$env:ANCHOR_WALLET = "tests/keypairs/admin.json"
npx ts-node scripts/setup_dev.ts
Write-Host "Setup complete!" -ForegroundColor Green

# Step 9: Fund wallets
Write-Host "`n[10/10] Checking and funding wallets..." -ForegroundColor Yellow
npx ts-node scripts/check_balances.ts
Write-Host "Wallets funded!" -ForegroundColor Green

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "  Pipeline Complete!                        " -ForegroundColor Cyan
Write-Host "  Validator is running with your wallets.   " -ForegroundColor Cyan
Write-Host "  Frontend ready at http://localhost:5173   " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
