# IPFS Service - SolCertify

Service backend pour gerer le stockage IPFS via Pinata.

## Statut

Complet - Service fonctionnel avec integration Pinata.

## Fonctionnalites

- Upload d'images de montres vers IPFS
- Generation de metadonnees JSON au format NFT
- Creation de certificats complets (image + metadata)
- Mode simulation si Pinata non configure

## Installation

```bash
cd ipfs-service
npm install
```

## Configuration

1. Creer un compte sur Pinata (<https://app.pinata.cloud/>)
2. Generer un JWT Token dans API Keys
3. Copier le fichier `.env.example` vers `.env`:

```bash
cp .env.example .env
```

1. Configurer votre JWT:

```env
PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PINATA_GATEWAY=gateway.pinata.cloud
PORT=3001
```

## Demarrage

```bash
# Production
npm start

# Developpement (auto-reload)
npm run dev
```

## Endpoints

### GET /health

Health check du service.

```bash
curl http://localhost:3001/health
```

### POST /api/upload/image

Upload une image vers IPFS.

```bash
curl -X POST -F "file=@watch.jpg" http://localhost:3001/api/upload/image
```

Response:

```json
{
  "success": true,
  "hash": "QmXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "url": "https://ipfs.io/ipfs/QmXxx...",
  "filename": "watch.jpg",
  "size": 245678
}
```

### POST /api/metadata/create

Cree et upload les metadonnees JSON d'un certificat.

```bash
curl -X POST http://localhost:3001/api/metadata/create \
  -H "Content-Type: application/json" \
  -d '{
    "serialNumber": "ROLEX-SUB-123456",
    "brand": "Rolex",
    "model": "Submariner Date",
    "certType": "Luxury",
    "estimatedValue": 15000,
    "imageUri": "ipfs://QmImageHash...",
    "owner": "7xKHj...PublicKey",
    "certifier": "5wGox...CertifierKey"
  }'
```

Response:

```json
{
  "success": true,
  "hash": "QmYyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy",
  "metadataUri": "ipfs://QmYyy...",
  "url": "https://ipfs.io/ipfs/QmYyy...",
  "metadata": { ... }
}
```

### POST /api/certificate/full

Cree un certificat complet (image + metadonnees en une requete).

```bash
curl -X POST http://localhost:3001/api/certificate/full \
  -F "image=@watch.jpg" \
  -F "serialNumber=ROLEX-SUB-123456" \
  -F "brand=Rolex" \
  -F "model=Submariner Date" \
  -F "certType=Luxury" \
  -F "estimatedValue=15000"
```

Response:

```json
{
  "success": true,
  "image": {
    "hash": "QmImageHash...",
    "uri": "ipfs://QmImageHash...",
    "url": "https://ipfs.io/ipfs/QmImageHash..."
  },
  "metadata": {
    "hash": "QmMetadataHash...",
    "uri": "ipfs://QmMetadataHash...",
    "url": "https://ipfs.io/ipfs/QmMetadataHash...",
    "content": { ... }
  }
}
```

## Mode Simulation

Si `PINATA_JWT` n'est pas configure, le service fonctionne en mode simulation :

- Les uploads retournent des hash simules
- Aucune donnee n'est envoyee a IPFS
- Utile pour le developpement local

## Integration Frontend

Dans le formulaire d'emission (IssueCertificateForm.tsx) :

1. Uploader l'image via /api/upload/image
2. Recuperer l'URI IPFS retournee
3. Passer cette URI lors de l'appel au smart contract

## Docker

```dockerfile
FROM node:18-alpine
WORKDIR /service
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]
```
