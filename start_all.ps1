# SolCertify - Lanceur
Write-Host "Demarrage..." -ForegroundColor Cyan

# 1. Backend (full_pipeline)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "& { cd backend; ./scripts/full_pipeline.ps1 }"

# 2. IPFS
Start-Process powershell -ArgumentList "-NoExit", "-Command", "& { cd ipfs-service; node server.js }"

# 3. Frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "& { cd frontend; npm run dev }"

Write-Host "Tout est lance." -ForegroundColor Green
