import { useState, useRef } from 'react';
import { useSolCertify } from '../hooks/useSolCertify';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import {
    Award,
    Loader2,
    CheckCircle,
    AlertCircle,
    Watch,
    User,
    Hash,
    FileText,
    Euro,
    Upload,
    Image as ImageIcon,
    X
} from 'lucide-react';
import { clsx } from 'clsx';
import { uploadImage, createMetadata } from '../services/ipfs';

type CertificationType = 'standard' | 'premium' | 'luxury' | 'exceptional';

interface CertTypeInfo {
    label: string;
    fee: number;
    feeLabel: string;
    description: string;
    color: string;
}

const CERT_TYPES: Record<CertificationType, CertTypeInfo> = {
    standard: {
        label: 'Standard',
        fee: 0.05,
        feeLabel: '0.05 SOL',
        description: 'Montres < 5 000 EUR',
        color: 'bg-blue-500',
    },
    premium: {
        label: 'Premium',
        fee: 0.1,
        feeLabel: '0.1 SOL',
        description: '5 000 - 20 000 EUR',
        color: 'bg-purple-500',
    },
    luxury: {
        label: 'Luxury',
        fee: 0.25,
        feeLabel: '0.25 SOL',
        description: '20 000 - 100 000 EUR',
        color: 'bg-gold-500',
    },
    exceptional: {
        label: 'Exceptional',
        fee: 0.5,
        feeLabel: '0.5 SOL',
        description: '> 100 000 EUR',
        color: 'bg-red-500',
    },
};

export const IssueCertificateForm = () => {
    const { program, getAuthorityPda, getCertificatePda, getUserActivityPda } = useSolCertify();
    const { publicKey } = useWallet();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        serialNumber: '',
        brand: '',
        model: '',
        certType: 'standard' as CertificationType,
        estimatedValue: '',
        ownerAddress: '',
    });

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageUri, setImageUri] = useState<string | null>(null);

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [step, setStep] = useState<'idle' | 'uploading' | 'metadata' | 'blockchain'>('idle');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                setImagePreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
            setImageUri(null);
        }
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview(null);
        setImageUri(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!program || !publicKey) return;

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            let metadataUri = '';

            // Step 1: Upload image if provided
            if (imageFile && !imageUri) {
                setStep('uploading');
                const uploadResult = await uploadImage(imageFile);
                setImageUri(uploadResult.url);
                metadataUri = `ipfs://${uploadResult.hash}`;
            }

            // Step 2: Create metadata on IPFS
            setStep('metadata');
            const metadataResult = await createMetadata({
                serialNumber: formData.serialNumber,
                brand: formData.brand,
                model: formData.model,
                certType: formData.certType,
                estimatedValue: parseInt(formData.estimatedValue),
                imageUri: imageUri || undefined,
                owner: formData.ownerAddress,
                certifier: publicKey.toBase58(),
            });

            metadataUri = metadataResult.metadataUri;

            // Step 3: Issue certificate on blockchain
            setStep('blockchain');
            const ownerPubkey = new PublicKey(formData.ownerAddress);
            const [authorityPda] = getAuthorityPda();
            const [certificatePda] = getCertificatePda(formData.serialNumber);
            const [ownerActivityPda] = getUserActivityPda(ownerPubkey);

            const authority = await (program.account as any).certificationAuthority.fetch(authorityPda);
            const treasuryPubkey = authority.treasury;

            const certTypeArg = { [formData.certType]: {} };

            const tx = await (program.methods as any)
                .issueCertificate(
                    formData.serialNumber,
                    formData.brand,
                    formData.model,
                    certTypeArg,
                    new BN(parseInt(formData.estimatedValue)),
                    metadataUri
                )
                .accounts({
                    certifier: publicKey,
                    owner: ownerPubkey,
                    authority: authorityPda,
                    certificate: certificatePda,
                    ownerActivity: ownerActivityPda,
                    treasury: treasuryPubkey,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            setSuccess(`Certificat emis avec succes ! TX: ${tx.slice(0, 16)}...`);

            // Reset form
            setFormData({
                serialNumber: '',
                brand: '',
                model: '',
                certType: 'standard',
                estimatedValue: '',
                ownerAddress: '',
            });
            handleRemoveImage();

        } catch (err: any) {
            console.error('Erreur emission certificat:', err);
            if (err.message?.includes('UnauthorizedCertifier')) {
                setError('Vous n\'etes pas un certificateur agree.');
            } else if (err.message?.includes('MaxCertificatesReached')) {
                setError('Le proprietaire a atteint la limite de 4 certificats.');
            } else {
                setError(err.message || 'Erreur lors de l\'emission du certificat.');
            }
        } finally {
            setLoading(false);
            setStep('idle');
        }
    };

    const selectedType = CERT_TYPES[formData.certType];

    const getStepLabel = () => {
        switch (step) {
            case 'uploading': return 'Upload image vers IPFS...';
            case 'metadata': return 'Creation des metadonnees...';
            case 'blockchain': return 'Emission sur la blockchain...';
            default: return 'Emettre le Certificat';
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-3">
                <div className="bg-gold-500/20 p-3 rounded-full">
                    <Award className="text-gold-500" size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-semibold text-white tracking-tight">Emettre un Certificat</h2>
                    <p className="text-sm text-slate-500">Reserve aux certificateurs agrees</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Type Selection */}
                <div className="grid grid-cols-4 gap-3">
                    {(Object.entries(CERT_TYPES) as [CertificationType, CertTypeInfo][]).map(([key, info]) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, certType: key }))}
                            className={clsx(
                                "p-4 rounded-xl border-2 transition-all text-center",
                                formData.certType === key
                                    ? "border-gold-500 bg-gold-500/10"
                                    : "border-white/10 bg-white/5 hover:border-white/20"
                            )}
                        >
                            <div className={clsx("w-3 h-3 rounded-full mx-auto mb-2", info.color)} />
                            <div className="text-sm font-semibold text-white">{info.label}</div>
                            <div className="text-[10px] text-slate-500">{info.feeLabel}</div>
                        </button>
                    ))}
                </div>

                {/* Image Upload */}
                <div className="space-y-2">
                    <label className="text-xs text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <ImageIcon size={12} /> Photo de la montre (optionnel)
                    </label>

                    {!imagePreview ? (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center cursor-pointer hover:border-gold-500/50 transition-colors"
                        >
                            <Upload className="mx-auto mb-3 text-slate-500" size={32} />
                            <p className="text-sm text-slate-400">Cliquez pour selectionner une image</p>
                            <p className="text-xs text-slate-600 mt-1">JPG, PNG ou WebP (max 10MB)</p>
                        </div>
                    ) : (
                        <div className="relative">
                            <img
                                src={imagePreview}
                                alt="Preview"
                                className="w-full h-48 object-cover rounded-xl border border-white/10"
                            />
                            <button
                                type="button"
                                onClick={handleRemoveImage}
                                className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
                            >
                                <X size={16} />
                            </button>
                            {imageUri && (
                                <div className="absolute bottom-2 left-2 px-2 py-1 bg-green-500/80 rounded text-xs text-white">
                                    Uploade sur IPFS
                                </div>
                            )}
                        </div>
                    )}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                    />
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Hash size={12} /> Numero de Serie
                        </label>
                        <input
                            type="text"
                            name="serialNumber"
                            value={formData.serialNumber}
                            onChange={handleChange}
                            placeholder="ROLEX-SUB-123456"
                            required
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Watch size={12} /> Marque
                        </label>
                        <input
                            type="text"
                            name="brand"
                            value={formData.brand}
                            onChange={handleChange}
                            placeholder="Rolex"
                            required
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <FileText size={12} /> Modele
                        </label>
                        <input
                            type="text"
                            name="model"
                            value={formData.model}
                            onChange={handleChange}
                            placeholder="Submariner Date"
                            required
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Euro size={12} /> Valeur Estimee (EUR)
                        </label>
                        <input
                            type="number"
                            name="estimatedValue"
                            value={formData.estimatedValue}
                            onChange={handleChange}
                            placeholder="15000"
                            required
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                        />
                    </div>

                    <div className="col-span-2 space-y-2">
                        <label className="text-xs text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <User size={12} /> Adresse du Proprietaire (Wallet Solana)
                        </label>
                        <input
                            type="text"
                            name="ownerAddress"
                            value={formData.ownerAddress}
                            onChange={handleChange}
                            placeholder="7xKHj...3Ks"
                            required
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white font-mono text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                        />
                    </div>
                </div>

                {/* Fee Info */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex justify-between items-center">
                    <div>
                        <div className="text-xs text-slate-500 uppercase">Frais de certification</div>
                        <div className="text-lg font-bold text-gold-500">{selectedType.feeLabel}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-slate-500 uppercase">Type selectionne</div>
                        <div className="text-lg font-semibold text-white">{selectedType.label}</div>
                    </div>
                </div>

                {/* Messages */}
                {error && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400">
                        <AlertCircle size={20} />
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-3 text-green-400">
                        <CheckCircle size={20} />
                        <p className="text-sm">{success}</p>
                    </div>
                )}

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={loading || !publicKey}
                    className="w-full luxury-button !py-4 !text-base flex items-center justify-center gap-3 disabled:opacity-50"
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" size={20} />
                            {getStepLabel()}
                        </>
                    ) : (
                        <>
                            <Award size={20} />
                            Emettre le Certificat
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};
