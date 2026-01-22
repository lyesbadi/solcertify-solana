/**
 * Service IPFS pour le frontend
 * Gere l'upload d'images et la creation de metadonnees via l'API IPFS locale
 */

// @ts-ignore - Vite injects import.meta.env at build time
const IPFS_API_URL = (import.meta as any).env?.VITE_IPFS_API_URL || 'http://localhost:3001';

export interface UploadImageResponse {
    success: boolean;
    hash: string;
    url: string;
    gatewayUrl?: string;
    filename: string;
    size: number;
    simulated?: boolean;
}

export interface CreateMetadataResponse {
    success: boolean;
    hash: string;
    metadataUri: string;
    url: string;
    gatewayUrl?: string;
    metadata: any;
    simulated?: boolean;
}

export interface CertificateFullResponse {
    success: boolean;
    simulated?: boolean;
    image: {
        hash: string;
        uri: string;
        url: string;
    } | null;
    metadata: {
        hash: string;
        uri: string;
        url: string;
        content: any;
    };
}

/**
 * Verifie que le service IPFS est disponible
 */
export async function checkIpfsHealth(): Promise<boolean> {
    try {
        const response = await fetch(`${IPFS_API_URL}/health`);
        const data = await response.json();
        return data.status === 'ok';
    } catch (error) {
        console.error('IPFS service non disponible:', error);
        return false;
    }
}

/**
 * Upload une image vers IPFS
 */
export async function uploadImage(file: File): Promise<UploadImageResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${IPFS_API_URL}/api/upload/image`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur upload image');
    }

    return response.json();
}

/**
 * Cree les metadonnees JSON et les upload sur IPFS
 */
export async function createMetadata(data: {
    serialNumber: string;
    brand: string;
    model: string;
    certType: string;
    estimatedValue: number;
    imageUri?: string;
    owner?: string;
    certifier?: string;
    reference?: string;
    year?: string;
    condition?: string;
}): Promise<CreateMetadataResponse> {
    const response = await fetch(`${IPFS_API_URL}/api/metadata/create`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur creation metadonnees');
    }

    return response.json();
}

/**
 * Cree un certificat complet (image + metadonnees) en une seule requete
 */
export async function createFullCertificate(
    file: File | null,
    data: {
        serialNumber: string;
        brand: string;
        model: string;
        certType: string;
        estimatedValue: number;
        owner?: string;
        certifier?: string;
        reference?: string;
        year?: string;
        condition?: string;
    }
): Promise<CertificateFullResponse> {
    const formData = new FormData();

    if (file) {
        formData.append('image', file);
    }

    Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            formData.append(key, String(value));
        }
    });

    const response = await fetch(`${IPFS_API_URL}/api/certificate/full`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur creation certificat');
    }

    return response.json();
}
