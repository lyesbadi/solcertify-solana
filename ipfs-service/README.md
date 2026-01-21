# IPFS Service - API Node.js

Service backend pour gérer le stockage IPFS via Pinata.

## Fonctionnalités

- Upload d'images vers IPFS
- Génération de métadonnées JSON
- API REST pour le frontend

## Installation

```bash
npm install
```

## Configuration

Créer un fichier `.env`:

```env
PINATA_API_KEY=your_api_key
PINATA_SECRET_KEY=your_secret_key
PORT=3001
```

## Commandes

```bash
# Démarrer le serveur
npm start

# Mode développement avec auto-reload
npm run dev
```

## Endpoints

### POST /api/upload/image

Upload une image vers IPFS

**Body**: FormData avec le champ `file`

**Response**:

```json
{
  "hash": "QmXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "url": "https://ipfs.io/ipfs/QmXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
}
```

### POST /api/metadata/create

Crée et upload des métadonnées JSON

**Body**:

```json
{
  "serialNumber": "ABC123",
  "brand": "Rolex",
  "model": "Submariner",
  "certType": "Luxury",
  "estimatedValue": 50000,
  "imageUri": "ipfs://QmXXX...",
  "owner": "PublicKey",
  "certifier": "PublicKey"
}
```

**Response**:

```json
{
  "metadataUri": "ipfs://QmYYY..."
}
```

## Phase actuelle

Phase 4  - À implémenter après les smart contracts
