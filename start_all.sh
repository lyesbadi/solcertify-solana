#!/bin/bash
# SolCertify - Lanceur Superviseur pour Linux/Mac

echo "Démarrage de l'environnement SolCertify..."

# Fonction pour lancer une commande dans un nouveau terminal
run_in_terminal() {
    TITLE=$1
    CMD=$2
    
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal --title="$TITLE" -- bash -c "$CMD; exec bash"
    elif command -v xterm &> /dev/null; then
        xterm -title "$TITLE" -e "bash -c \"$CMD; exec bash\"" &
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        osascript -e "tell application \"Terminal\" to do script \"$CMD\""
    else
        echo "Aucun terminal séparé trouvé. Lancement en arrière-plan : $TITLE"
        eval "$CMD" &
    fi
}

# 1. Pipeline Backend
echo "Lancement du Pipeline Backend..."
run_in_terminal "SolCertify Backend" "cd backend/scripts && ./full_pipeline.sh"

# 2. Service IPFS
echo "Lancement du Service IPFS..."
run_in_terminal "SolCertify IPFS" "cd ipfs-service && npm install && node server.js"

# 3. Frontend
echo "Lancement du Frontend..."
run_in_terminal "SolCertify Frontend" "cd frontend && sleep 5 && npm install && npm run dev"

echo "---------------------------------------------------"
echo "Tous les services ont été lancés !"
echo "Le Backend s'initialise..."
echo "Frontend disponible sur : http://localhost:5173"
echo "---------------------------------------------------"
