#!/bin/bash

# ===================================================================
# Script de Lancement Automatique - DecentraVote Solana (macOS/Linux)
# ===================================================================

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

echo -e "${CYAN}=================================================${NC}"
echo -e "${CYAN}   DecentraVote - Lancement Automatique${NC}"
echo -e "${CYAN}=================================================${NC}"
echo ""

# ===== 1. VERIFICATION DES OUTILS =====
echo -e "${YELLOW}[1/9] Verification des outils installes...${NC}"

check_command() {
    if command -v $1 &> /dev/null; then
        version=$($2 2>&1 | head -n1)
        echo -e "  ${GREEN}[OK]${NC} $1 : $version"
        return 0
    else
        echo -e "  ${RED}[ERREUR]${NC} $1 n'est pas installe"
        return 1
    fi
}

all_installed=true
check_command "rustc" "rustc --version" || all_installed=false
check_command "cargo" "cargo --version" || all_installed=false
check_command "solana" "solana --version" || all_installed=false
check_command "anchor" "anchor --version" || all_installed=false
check_command "node" "node --version" || all_installed=false
check_command "npm" "npm --version" || all_installed=false

if [ "$all_installed" = false ]; then
    echo ""
    echo -e "${RED}Erreur : Certains outils ne sont pas installes.${NC}"
    echo -e "${YELLOW}Veuillez consulter SETUP.md pour les instructions d'installation.${NC}"
    exit 1
fi

echo ""

# ===== 2. CONFIGURATION SOLANA =====
echo -e "${YELLOW}[2/9] Configuration de Solana...${NC}"

# Configurer pour localhost
echo -e "  ${GRAY}- Configuration du reseau : localhost${NC}"
solana config set --url localhost &> /dev/null

# Vérifier si le keypair existe
KEYPAIR_PATH="$HOME/.config/solana/id.json"
if [ ! -f "$KEYPAIR_PATH" ]; then
    echo -e "  ${GRAY}- Creation du keypair de developpement...${NC}"
    mkdir -p "$HOME/.config/solana"
    solana-keygen new --no-bip39-passphrase -o "$KEYPAIR_PATH" --force &> /dev/null
    echo -e "  ${GREEN}[OK]${NC} Keypair cree : $KEYPAIR_PATH"
else
    echo -e "  ${GREEN}[OK]${NC} Keypair existe deja"
fi

echo ""

# ===== 3. DEMARRAGE DU VALIDATEUR LOCAL =====
echo -e "${YELLOW}[3/9] Verification du validateur Solana...${NC}"

# Vérifier si le validateur est déjà en cours d'exécution
if curl -s http://localhost:8899/health &> /dev/null; then
    echo -e "  ${GREEN}[OK]${NC} Le validateur local est deja en cours d'execution"
else
    echo -e "  ${GRAY}- Demarrage du validateur local...${NC}"
    echo -e "    ${GRAY}(Cela peut prendre 30-60 secondes...)${NC}"

    # Démarrer le validateur en arrière-plan
    solana-test-validator > /tmp/solana-validator.log 2>&1 &
    VALIDATOR_PID=$!

    # Attendre que le validateur soit prêt
    echo -e "  ${GRAY}- Attente du demarrage du validateur...${NC}"
    max_attempts=30
    attempt=0
    started=false

    while [ $attempt -lt $max_attempts ] && [ "$started" = false ]; do
        sleep 2
        ((attempt++))
        if curl -s http://localhost:8899/health &> /dev/null; then
            started=true
        else
            echo -n "."
        fi
    done

    if [ "$started" = true ]; then
        echo ""
        echo -e "  ${GREEN}[OK]${NC} Validateur demarre avec succes ! (PID: $VALIDATOR_PID)"
        echo -e "  ${GRAY}Logs disponibles dans : /tmp/solana-validator.log${NC}"
    else
        echo ""
        echo -e "  ${YELLOW}[AVERTISSEMENT]${NC} Le validateur met du temps a demarrer..."
        echo -e "  ${YELLOW}Verifiez les logs : tail -f /tmp/solana-validator.log${NC}"
    fi
fi

echo ""

# ===== 4. AIRDROP DE SOL =====
echo -e "${YELLOW}[4/9] Approvisionnement du wallet...${NC}"

balance=$(solana balance 2>&1 | grep -oE '[0-9]+(\.[0-9]+)?')
echo -e "  ${GRAY}- Balance actuelle : $balance SOL${NC}"

if (( $(echo "$balance < 10" | bc -l) )); then
    echo -e "  ${GRAY}- Airdrop de 10 SOL...${NC}"
    solana airdrop 10 &> /dev/null
    sleep 2
    new_balance=$(solana balance 2>&1 | grep -oE '[0-9]+(\.[0-9]+)?')
    echo -e "  ${GREEN}[OK]${NC} Nouvelle balance : $new_balance SOL"
else
    echo -e "  ${GREEN}[OK]${NC} Balance suffisante"
fi

echo ""

# ===== 5. INSTALLATION DES DEPENDANCES NPM =====
echo -e "${YELLOW}[5/9] Installation des dependances Node.js...${NC}"

if [ -f "package.json" ]; then
    npm install &> /dev/null
    echo -e "  ${GREEN}[OK]${NC} Dependances installees"
else
    echo -e "  ${YELLOW}[SKIP]${NC} Pas de package.json trouve"
fi

echo ""

# ===== 6. BUILD DU PROGRAMME =====
echo -e "${YELLOW}[6/9] Compilation du programme...${NC}"

echo -e "  ${GRAY}- Utilisation de cargo build-sbf...${NC}"
if cargo build-sbf -- --locked &> /dev/null; then
    echo -e "  ${GREEN}[OK]${NC} Programme compile avec succes"
else
    echo -e "  ${RED}[ERREUR]${NC} Echec de la compilation"
    echo -e "  ${YELLOW}Executez 'cargo build-sbf -- --locked' manuellement pour voir les erreurs${NC}"
    exit 1
fi

echo ""

# ===== 7. DEPLOIEMENT DU PROGRAMME =====
echo -e "${YELLOW}[7/9] Deploiement du programme...${NC}"

echo -e "  ${GRAY}- Deploiement avec solana program deploy...${NC}"
if solana program deploy target/deploy/decentravote.so &> /dev/null; then
    echo -e "  ${GREEN}[OK]${NC} Programme deploye avec succes"
else
    echo -e "  ${RED}[ERREUR]${NC} Echec du deploiement"
    echo -e "  ${YELLOW}Executez 'solana program deploy target/deploy/decentravote.so' manuellement pour voir les erreurs${NC}"
    exit 1
fi

echo ""

# ===== 8. EXECUTION DES TESTS =====
echo -e "${YELLOW}[8/9] Execution des tests...${NC}"

echo -e "  ${GRAY}- Execution avec ts-mocha...${NC}"
if npx ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts &> /dev/null; then
    echo -e "  ${GREEN}[OK]${NC} Tests passes avec succes"
else
    echo -e "  ${YELLOW}[AVERTISSEMENT]${NC} Certains tests ont echoue"
    echo -e "  ${YELLOW}Executez 'npx ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts' pour voir les details${NC}"
fi

echo ""

# ===== 9. INSTALLATION ET LANCEMENT DU FRONTEND =====
echo -e "${YELLOW}[9/9] Lancement du frontend React...${NC}"

if [ -f "app/package.json" ]; then
    echo -e "  ${GRAY}- Installation des dependances du frontend...${NC}"
    cd app
    npm install &> /dev/null
    if [ $? -eq 0 ]; then
        echo -e "  ${GREEN}[OK]${NC} Dependances du frontend installees"
    else
        echo -e "  ${RED}[ERREUR]${NC} Echec de l'installation des dependances du frontend"
        cd ..
        exit 1
    fi

    echo -e "  ${GRAY}- Demarrage du serveur de developpement Vite...${NC}"
    echo -e "    ${GRAY}(Le frontend s'ouvrira dans un nouvel onglet)${NC}"

    # Démarrer Vite en arrière-plan
    npm run dev > /tmp/vite.log 2>&1 &
    VITE_PID=$!

    # Attendre que Vite démarre
    sleep 3
    echo -e "  ${GREEN}[OK]${NC} Frontend demarre avec succes ! (PID: $VITE_PID)"
    echo -e "    ${CYAN}Accessible sur : http://localhost:5173${NC}"
    echo -e "    ${GRAY}Logs disponibles dans : /tmp/vite.log${NC}"

    cd ..
else
    echo -e "  ${YELLOW}[SKIP]${NC} Pas de frontend trouve dans ./app"
fi

echo ""

# ===== RESUME =====
echo -e "${CYAN}=================================================${NC}"
echo -e "${CYAN}           LANCEMENT TERMINE !${NC}"
echo -e "${CYAN}=================================================${NC}"
echo ""
echo -e "${GREEN}Le projet DecentraVote est maintenant pret !${NC}"
echo ""
echo -e "${YELLOW}Informations utiles :${NC}"
echo -e "  - Validateur local : http://localhost:8899"
echo -e "  - Frontend React   : http://localhost:5173"
echo -e "  - Program ID       : FspmA7UoptTCbR1oq1Rd5iHg737gTeKCRfZwfJtj7Fjb"
echo -e "  - Keypair          : $KEYPAIR_PATH"
echo ""
echo -e "${YELLOW}Commandes utiles :${NC}"
echo -e "  npm test                                      - Executer les tests"
echo -e "  cargo build-sbf -- --locked                   - Recompiler le programme"
echo -e "  solana program deploy target/deploy/decentravote.so - Deployer le programme"
echo -e "  solana logs                                   - Voir les logs du programme"
echo -e "  cd app && npm run dev                         - Relancer le frontend"
echo ""
echo -e "${CYAN}Bon developpement ! 🚀${NC}"
