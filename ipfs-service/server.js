/**
 * SolCertify IPFS Service
 * 
 * API Express pour gérer le stockage IPFS via Pinata:
 * - Upload d'images de montres
 * - Génération de métadonnées JSON
 * - Création de certificats complets
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { PinataSDK } = require('pinata-web3');
const { Readable } = require('stream');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuration Multer pour l'upload de fichiers en mémoire
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
    },
    fileFilter: (req, file, cb) => {
        // Accepter uniquement les images
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Seules les images sont acceptées'), false);
        }
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// Initialiser Pinata SDK
let pinata;
try {
    if (!process.env.PINATA_JWT) {
        console.warn(' PINATA_JWT non configuré - Mode simulation activé');
    } else {
        pinata = new PinataSDK({
            pinataJwt: process.env.PINATA_JWT,
            pinataGateway: process.env.PINATA_GATEWAY || 'gateway.pinata.cloud'
        });
        console.log(' Pinata SDK initialisé');
    }
} catch (error) {
    console.error(' Erreur initialisation Pinata:', error.message);
}

// ============================================
// ENDPOINTS
// ============================================

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'solcertify-ipfs',
        pinataConfigured: !!pinata,
        timestamp: new Date().toISOString()
    });
});

/**
 * POST /api/upload/image
 * Upload une image vers IPFS
 */
app.post('/api/upload/image', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Aucun fichier fourni' });
        }

        // Mode simulation si Pinata non configuré
        if (!pinata) {
            const fakeHash = `Qm${Date.now().toString(36)}SimulatedHash`;
            console.log(`[SIMULATION] Image uploadee: ${req.file.originalname}`);
            return res.json({
                success: true,
                simulated: true,
                hash: fakeHash,
                url: `https://ipfs.io/ipfs/${fakeHash}`,
                filename: req.file.originalname,
                size: req.file.size
            });
        }

        // Upload réel vers Pinata
        const file = new File([req.file.buffer], req.file.originalname, {
            type: req.file.mimetype
        });

        const result = await pinata.upload.file(file);

        console.log(`Image uploadee: ${result.IpfsHash}`);

        res.json({
            success: true,
            hash: result.IpfsHash,
            url: `https://ipfs.io/ipfs/${result.IpfsHash}`,
            gatewayUrl: `https://${process.env.PINATA_GATEWAY || 'gateway.pinata.cloud'}/ipfs/${result.IpfsHash}`,
            filename: req.file.originalname,
            size: req.file.size
        });

    } catch (error) {
        console.error(' Erreur upload image:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/metadata/create
 * Crée et upload les métadonnées JSON d'un certificat
 */
app.post('/api/metadata/create', async (req, res) => {
    try {
        const {
            serialNumber,
            brand,
            model,
            certType,
            estimatedValue,
            imageUri,
            owner,
            certifier,
            reference,
            year,
            condition,
            expertiseReport
        } = req.body;

        // Validation des champs requis
        if (!serialNumber || !brand || !model || !certType) {
            return res.status(400).json({
                error: 'Champs requis manquants: serialNumber, brand, model, certType'
            });
        }

        // Construction des métadonnées au format NFT standard
        const metadata = {
            name: `${brand} ${model}`,
            symbol: 'SOLCERT',
            description: `Certificat d'authenticité SolCertify pour ${brand} ${model}`,
            image: imageUri || '',
            external_url: `https://solcertify.io/verify/${serialNumber}`,
            attributes: [
                { trait_type: 'Brand', value: brand },
                { trait_type: 'Model', value: model },
                { trait_type: 'Serial Number', value: serialNumber },
                { trait_type: 'Certification Type', value: certType },
                { trait_type: 'Estimated Value', value: `${estimatedValue || 0} EUR` },
                { trait_type: 'Year', value: year || 'Unknown' },
                { trait_type: 'Condition', value: condition || 'Unknown' },
                { trait_type: 'Reference', value: reference || 'N/A' },
            ],
            properties: {
                serialNumber,
                brand,
                model,
                certType,
                estimatedValue: estimatedValue || 0,
                currency: 'EUR',
                owner: owner || '',
                certifier: certifier || '',
                expertiseReport: expertiseReport || '',
                certificationFee: getCertificationFee(certType),
                createdAt: new Date().toISOString()
            }
        };

        // Mode simulation si Pinata non configuré
        if (!pinata) {
            const fakeHash = `Qm${Date.now().toString(36)}MetadataSimulated`;
            console.log(`[SIMULATION] Metadonnees creees pour: ${serialNumber}`);
            return res.json({
                success: true,
                simulated: true,
                hash: fakeHash,
                metadataUri: `ipfs://${fakeHash}`,
                url: `https://ipfs.io/ipfs/${fakeHash}`,
                metadata
            });
        }

        // Upload réel vers Pinata
        const result = await pinata.upload.json(metadata);

        console.log(`Metadonnees uploadees: ${result.IpfsHash}`);

        res.json({
            success: true,
            hash: result.IpfsHash,
            metadataUri: `ipfs://${result.IpfsHash}`,
            url: `https://ipfs.io/ipfs/${result.IpfsHash}`,
            gatewayUrl: `https://${process.env.PINATA_GATEWAY || 'gateway.pinata.cloud'}/ipfs/${result.IpfsHash}`,
            metadata
        });

    } catch (error) {
        console.error(' Erreur création métadonnées:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/certificate/full
 * Crée un certificat complet (image + métadonnées)
 */
app.post('/api/certificate/full', upload.single('image'), async (req, res) => {
    try {
        const {
            serialNumber,
            brand,
            model,
            certType,
            estimatedValue,
            owner,
            certifier,
            reference,
            year,
            condition
        } = req.body;

        // Validation
        if (!serialNumber || !brand || !model || !certType) {
            return res.status(400).json({
                error: 'Champs requis manquants'
            });
        }

        let imageHash = null;
        let imageUrl = null;

        // Step 1: Upload image si fournie
        if (req.file) {
            if (pinata) {
                const file = new File([req.file.buffer], req.file.originalname, {
                    type: req.file.mimetype
                });
                const imageResult = await pinata.upload.file(file);
                imageHash = imageResult.IpfsHash;
                imageUrl = `ipfs://${imageHash}`;
                console.log(`Image uploadee: ${imageHash}`);
            } else {
                imageHash = `Qm${Date.now().toString(36)}ImageSim`;
                imageUrl = `ipfs://${imageHash}`;
            }
        }

        // Step 2: Créer les métadonnées
        const metadata = {
            name: `${brand} ${model}`,
            symbol: 'SOLCERT',
            description: `Certificat d'authenticité SolCertify pour ${brand} ${model}`,
            image: imageUrl || '',
            external_url: `https://solcertify.io/verify/${serialNumber}`,
            attributes: [
                { trait_type: 'Brand', value: brand },
                { trait_type: 'Model', value: model },
                { trait_type: 'Serial Number', value: serialNumber },
                { trait_type: 'Certification Type', value: certType },
                { trait_type: 'Estimated Value', value: `${estimatedValue || 0} EUR` },
                { trait_type: 'Year', value: year || 'Unknown' },
                { trait_type: 'Condition', value: condition || 'Unknown' },
                { trait_type: 'Reference', value: reference || 'N/A' },
            ],
            properties: {
                serialNumber,
                brand,
                model,
                certType,
                estimatedValue: parseInt(estimatedValue) || 0,
                currency: 'EUR',
                owner: owner || '',
                certifier: certifier || '',
                certificationFee: getCertificationFee(certType),
                createdAt: new Date().toISOString()
            }
        };

        // Step 3: Upload métadonnées
        let metadataHash;
        if (pinata) {
            const metaResult = await pinata.upload.json(metadata);
            metadataHash = metaResult.IpfsHash;
            console.log(`Metadonnees uploadees: ${metadataHash}`);
        } else {
            metadataHash = `Qm${Date.now().toString(36)}MetaSim`;
        }

        res.json({
            success: true,
            simulated: !pinata,
            image: imageHash ? {
                hash: imageHash,
                uri: imageUrl,
                url: `https://ipfs.io/ipfs/${imageHash}`
            } : null,
            metadata: {
                hash: metadataHash,
                uri: `ipfs://${metadataHash}`,
                url: `https://ipfs.io/ipfs/${metadataHash}`,
                content: metadata
            }
        });

    } catch (error) {
        console.error(' Erreur création certificat complet:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Calcule les frais de certification selon le type
 */
function getCertificationFee(certType) {
    const fees = {
        'Standard': 0.05,
        'standard': 0.05,
        'Premium': 0.1,
        'premium': 0.1,
        'Luxury': 0.25,
        'luxury': 0.25,
        'Exceptional': 0.5,
        'exceptional': 0.5
    };
    return fees[certType] || 0;
}

// ============================================
// DÉMARRAGE DU SERVEUR
// ============================================

app.listen(PORT, () => {
    console.log('');
    console.log(' ═══════════════════════════════════════════');
    console.log(`   SolCertify IPFS Service - Port ${PORT}`);
    console.log('══════════════════════════════════════════════');
    console.log('');
    console.log(' Endpoints disponibles:');
    console.log(`   GET  /health              - Health check`);
    console.log(`   POST /api/upload/image    - Upload image`);
    console.log(`   POST /api/metadata/create - Create metadata`);
    console.log(`   POST /api/certificate/full - Full certificate`);
    console.log('');
    console.log(` http://localhost:${PORT}/health`);
    console.log('');
});
