# ===================================================================
# Script de Lancement Automatique - DecentraVote Solana (Windows)
# ===================================================================

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "   DecentraVote - Lancement Automatique" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Fonction pour vérifier si une commande existe
function Test-Command {
    param($Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

# ===== 1. VERIFICATION DES OUTILS =====
Write-Host "[1/9] Verification des outils installes..." -ForegroundColor Yellow

# Ordre spécifique pour les vérifications
$toolsToCheck = @(
    @{Name="rustc"; Command="rustc --version"},
    @{Name="cargo"; Command="cargo --version"},
    @{Name="solana"; Command="solana --version"},
    @{Name="anchor"; Command="anchor --version"},
    @{Name="node"; Command="node --version"},
    @{Name="npm"; Command="npm --version"}
)

$allInstalled = $true
foreach ($tool in $toolsToCheck) {
    if (Test-Command $tool.Name) {
        try {
            $version = Invoke-Expression $tool.Command 2>&1 | Select-Object -First 1
            Write-Host "  [OK] $($tool.Name) : $version" -ForegroundColor Green
        } catch {
            Write-Host "  [ERREUR] $($tool.Name) n'est pas installe correctement" -ForegroundColor Red
            $allInstalled = $false
        }
    } else {
        Write-Host "  [ERREUR] $($tool.Name) n'est pas installe" -ForegroundColor Red
        $allInstalled = $false
    }
}

if (-not $allInstalled) {
    Write-Host ""
    Write-Host "Erreur : Certains outils ne sont pas installes." -ForegroundColor Red
    Write-Host "Veuillez consulter SETUP.md pour les instructions d'installation." -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# ===== 2. CONFIGURATION SOLANA =====
Write-Host "[2/9] Configuration de Solana..." -ForegroundColor Yellow

# Configurer pour localhost
Write-Host "  - Configuration du reseau : localhost" -ForegroundColor Gray
solana config set --url localhost 2>&1 | Out-Null

# Vérifier si le keypair existe
$keypairPath = "$env:USERPROFILE\.config\solana\id.json"
if (-not (Test-Path $keypairPath)) {
    Write-Host "  - Creation du keypair de developpement..." -ForegroundColor Gray
    New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.config\solana" | Out-Null
    solana-keygen new --no-bip39-passphrase -o $keypairPath --force 2>&1 | Out-Null
    Write-Host "  [OK] Keypair cree : $keypairPath" -ForegroundColor Green
} else {
    Write-Host "  [OK] Keypair existe deja" -ForegroundColor Green
}

Write-Host ""

# ===== 3. DEMARRAGE DU VALIDATEUR LOCAL =====
Write-Host "[3/9] Verification du validateur Solana..." -ForegroundColor Yellow

# Vérifier si le validateur est déjà en cours d'exécution
$validatorRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8899/health" -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        $validatorRunning = $true
    }
} catch {
    $validatorRunning = $false
}

if ($validatorRunning) {
    Write-Host "  [OK] Le validateur local est deja en cours d'execution" -ForegroundColor Green
} else {
    Write-Host "  - Demarrage du validateur local..." -ForegroundColor Gray
    Write-Host "    (Cela peut prendre 30-60 secondes...)" -ForegroundColor Gray

    # Démarrer le validateur dans une nouvelle fenêtre
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "solana-test-validator" -WindowStyle Normal

    # Attendre que le validateur soit prêt
    Write-Host "  - Attente du demarrage du validateur..." -ForegroundColor Gray
    $maxAttempts = 30
    $attempt = 0
    $started = $false

    while ($attempt -lt $maxAttempts -and -not $started) {
        Start-Sleep -Seconds 2
        $attempt++
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:8899/health" -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                $started = $true
            }
        } catch {
            Write-Host "." -NoNewline -ForegroundColor Gray
        }
    }

    if ($started) {
        Write-Host ""
        Write-Host "  [OK] Validateur demarre avec succes !" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "  [AVERTISSEMENT] Le validateur met du temps a demarrer..." -ForegroundColor Yellow
        Write-Host "  Verifiez la fenetre du validateur pour les logs." -ForegroundColor Yellow
    }
}

Write-Host ""

# ===== 4. AIRDROP DE SOL =====
Write-Host "[4/9] Approvisionnement du wallet..." -ForegroundColor Yellow

$balance = solana balance 2>&1 | Select-String -Pattern "[\d\.]+" | ForEach-Object { $_.Matches.Value }
Write-Host "  - Balance actuelle : $balance SOL" -ForegroundColor Gray

if ([double]$balance -lt 10) {
    Write-Host "  - Airdrop de 10 SOL..." -ForegroundColor Gray
    solana airdrop 10 2>&1 | Out-Null
    Start-Sleep -Seconds 2
    $newBalance = solana balance 2>&1 | Select-String -Pattern "[\d\.]+" | ForEach-Object { $_.Matches.Value }
    Write-Host "  [OK] Nouvelle balance : $newBalance SOL" -ForegroundColor Green
} else {
    Write-Host "  [OK] Balance suffisante" -ForegroundColor Green
}

Write-Host ""

# ===== 5. INSTALLATION DES DEPENDANCES NPM =====
Write-Host "[5/9] Installation des dependances Node.js..." -ForegroundColor Yellow

if (Test-Path "package.json") {
    npm install 2>&1 | Out-Null
    Write-Host "  [OK] Dependances installees" -ForegroundColor Green
} else {
    Write-Host "  [SKIP] Pas de package.json trouve" -ForegroundColor Yellow
}

Write-Host ""

# ===== 6. BUILD DU PROGRAMME =====
Write-Host "[6/9] Compilation du programme..." -ForegroundColor Yellow

Write-Host "  - Utilisation de cargo build-sbf..." -ForegroundColor Gray
cargo build-sbf -- --locked 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Programme compile avec succes" -ForegroundColor Green
} else {
    Write-Host "  [ERREUR] Echec de la compilation" -ForegroundColor Red
    Write-Host "  Executez 'cargo build-sbf -- --locked' manuellement pour voir les erreurs" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# ===== 7. DEPLOIEMENT DU PROGRAMME =====
Write-Host "[7/9] Deploiement du programme..." -ForegroundColor Yellow

Write-Host "  - Deploiement avec solana program deploy..." -ForegroundColor Gray
solana program deploy target/deploy/decentravote.so 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Programme deploye avec succes" -ForegroundColor Green
} else {
    Write-Host "  [ERREUR] Echec du deploiement" -ForegroundColor Red
    Write-Host "  Executez 'solana program deploy target/deploy/decentravote.so' manuellement pour voir les erreurs" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# ===== 8. EXECUTION DES TESTS =====
Write-Host "[8/9] Execution des tests..." -ForegroundColor Yellow

Write-Host "  - Execution avec ts-mocha..." -ForegroundColor Gray
npx ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Tests passes avec succes" -ForegroundColor Green
} else {
    Write-Host "  [AVERTISSEMENT] Certains tests ont echoue" -ForegroundColor Yellow
    Write-Host "  Executez 'npx ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts' pour voir les details" -ForegroundColor Yellow
}

Write-Host ""

# ===== 9. INSTALLATION ET LANCEMENT DU FRONTEND =====
Write-Host "[9/9] Lancement du frontend React..." -ForegroundColor Yellow

if (Test-Path "app/package.json") {
    Write-Host "  - Installation des dependances du frontend..." -ForegroundColor Gray
    Push-Location app
    npm install 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Dependances du frontend installees" -ForegroundColor Green
    } else {
        Write-Host "  [ERREUR] Echec de l'installation des dependances du frontend" -ForegroundColor Red
        Pop-Location
        exit 1
    }

    Write-Host "  - Demarrage du serveur de developpement Vite..." -ForegroundColor Gray
    Write-Host "    (Le frontend s'ouvrira dans une nouvelle fenetre)" -ForegroundColor Gray

    # Démarrer Vite dans une nouvelle fenêtre PowerShell
    Start-Process powershell -ArgumentList "-NoExit", "-Command", " npm run dev" -WindowStyle Normal

    # Attendre que Vite démarre
    Start-Sleep -Seconds 3
    Write-Host "  [OK] Frontend demarre avec succes !" -ForegroundColor Green
    Write-Host "    Accessible sur : http://localhost:5173" -ForegroundColor Cyan

    Pop-Location
} else {
    Write-Host "  [SKIP] Pas de frontend trouve dans ./app" -ForegroundColor Yellow
}

Write-Host ""

# ===== RESUME =====
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "           LANCEMENT TERMINE !" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Le projet DecentraVote est maintenant pret !" -ForegroundColor Green
Write-Host ""
Write-Host "Informations utiles :" -ForegroundColor Yellow
Write-Host "  - Validateur local : http://localhost:8899" -ForegroundColor White
Write-Host "  - Frontend React   : http://localhost:5173" -ForegroundColor White
Write-Host "  - Program ID       : FspmA7UoptTCbR1oq1Rd5iHg737gTeKCRfZwfJtj7Fjb" -ForegroundColor White
Write-Host "  - Keypair          : $keypairPath" -ForegroundColor White
Write-Host ""
Write-Host "Commandes utiles :" -ForegroundColor Yellow
Write-Host "  npm test                                      - Executer les tests" -ForegroundColor White
Write-Host "  cargo build-sbf -- --locked                   - Recompiler le programme" -ForegroundColor White
Write-Host "  solana program deploy target/deploy/decentravote.so - Deployer le programme" -ForegroundColor White
Write-Host "  solana logs                                   - Voir les logs du programme" -ForegroundColor White
Write-Host " npm run dev                         - Relancer le frontend" -ForegroundColor White
Write-Host ""
Write-Host "dev launched" -ForegroundColor Cyan
