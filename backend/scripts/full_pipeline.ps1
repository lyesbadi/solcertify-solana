# SolCertify - Pipeline Complet de Build & Test
# Exécutez ceci depuis le dossier backend

$ErrorActionPreference = "Stop"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  SolCertify - Pipeline Complet de Build  " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# Fonction pour démarrer le validateur
function Start-Validator {
    Write-Host "Démarrage d'un validateur frais..." -ForegroundColor Yellow
    if (Test-Path "test-ledger") { Remove-Item -Recurse -Force "test-ledger" }
    
    # Démarrer le validateur en arrière-plan
    Start-Process -FilePath "solana-test-validator" -NoNewWindow
    
    Write-Host "Attente de 10 secondes pour le démarrage du validateur..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
}

# Fonction pour arrêter le validateur
function Stop-Validator {
    Write-Host "Arrêt du validateur..." -ForegroundColor Yellow
    Stop-Process -Name "solana-test-validator" -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# Configurer l'URL du provider
$env:ANCHOR_PROVIDER_URL = "http://127.0.0.1:8899"

# ============================================
# PHASE 1: Build & Test
# ============================================
Write-Host ""
Write-Host "========== PHASE 1: BUILD & TEST ==========" -ForegroundColor Magenta

# Étape 1: Démarrer un validateur propre
Write-Host ""
Write-Host "[1/10] Démarrage du validateur pour les tests..." -ForegroundColor Green
Stop-Validator
Start-Validator

# Étape 2: Compiler le programme Solana
Write-Host ""
Write-Host "[2/10] Compilation du programme Solana..." -ForegroundColor Green
cargo build-bpf --manifest-path programs/solcertify/Cargo.toml
Write-Host "Compilation réussie !" -ForegroundColor Green

# Étape 3: Déployer sur le validateur local
Write-Host ""
Write-Host "[3/10] Déploiement sur le validateur local..." -ForegroundColor Green
anchor deploy
Write-Host "Déploiement réussi !" -ForegroundColor Green

# Étape 4: Synchroniser l'IDL vers le frontend
Write-Host ""
Write-Host "[4/10] Synchronisation de l'IDL vers le frontend..." -ForegroundColor Green
Copy-Item "target/idl/solcertify.json" "../frontend/src/idl/solcertify.json" -Force
Write-Host "IDL synchronisé !" -ForegroundColor Green

# Étape 5: Générer les paires de clés depuis .env
Write-Host ""
Write-Host "[5/10] Génération des clés depuis .env..." -ForegroundColor Green
npx ts-node scripts/generate_keypairs.ts
Write-Host "Clés prêtes !" -ForegroundColor Green

# Étape 6: Compiler et exécuter les tests
Write-Host ""
Write-Host "[6/10] Compilation et exécution des tests..." -ForegroundColor Green
npx tsc tests/solcertify.ts --outDir tests_js --target es2020 --module commonjs --skipLibCheck --esModuleInterop

$env:ANCHOR_WALLET = "$HOME/.config/solana/id.json"
npx mocha tests_js/solcertify.js --timeout 1000000
Write-Host "Tests terminés !" -ForegroundColor Green

# ============================================
# PHASE 2: Configuration pour le Frontend
# ============================================
Write-Host ""
Write-Host "========== PHASE 2: CONFIGURATION FRONTEND ==========" -ForegroundColor Magenta

# Étape 7: Réinitialiser le validateur pour avoir un état propre
Write-Host ""
Write-Host "[7/10] Réinitialisation du validateur pour le frontend..." -ForegroundColor Green
Stop-Validator
Start-Validator

# Étape 8: Redéployer le programme
Write-Host ""
Write-Host "[8/10] Redéploiement du programme..." -ForegroundColor Green
anchor deploy
Write-Host "Déploiement réussi !" -ForegroundColor Green

# Étape 9: Exécuter setup_dev (initialiser avec VOS clés)
Write-Host ""
Write-Host "[9/10] Exécution de setup_dev.ts..." -ForegroundColor Green
$env:ANCHOR_WALLET = "tests/keypairs/admin.json"
npx ts-node scripts/setup_dev.ts
Write-Host "Configuration terminée !" -ForegroundColor Green

# Étape 10: Financer les wallets
Write-Host ""
Write-Host "[10/10] Vérification et financement des wallets..." -ForegroundColor Green
npx ts-node scripts/check_balances.ts
Write-Host "Wallets financés !" -ForegroundColor Green

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Pipeline Terminé !                        " -ForegroundColor Cyan
Write-Host "  Le validateur tourne avec vos wallets.    " -ForegroundColor Cyan
Write-Host "  Frontend prêt sur http://localhost:5173   " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
