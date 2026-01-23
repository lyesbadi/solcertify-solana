import { useState, useRef, useEffect } from 'react';
import { useSolCertify } from '../hooks/useSolCertify';
import { useWallet } from '@solana/wallet-adapter-react';
import { SystemProgram, PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import {
    Loader2,
    CheckCircle,
    AlertCircle,
    Watch,
    Hash,
    FileText,
    Euro,
    Upload,
    Image as ImageIcon,
    X,
    Send,
    UserCheck
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

interface CertifierInfo {
    publicKey: PublicKey;
    displayName: string;
    physicalAddress: string;
    currentLoad: number;
    totalProcessed: number;
}

export const RequestCertificationForm = () => {
    const { program, getAuthorityPda, getRequestPda, getCertifierProfilePda } = useSolCertify();
    const { publicKey } = useWallet();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        serialNumber: '',
        brand: '',
        model: '',
        certType: 'standard' as CertificationType,
        estimatedValue: '',
        targetCertifier: '', // User selection
    });

    // Certifiers
    const [certifiers, setCertifiers] = useState<CertifierInfo[]>([]);
    const [loadingCertifiers, setLoadingCertifiers] = useState(true);

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageUri, setImageUri] = useState<string | null>(null);

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [step, setStep] = useState<'idle' | 'uploading' | 'metadata' | 'blockchain'>('idle');

    // Fetch certifiers on mount
    useEffect(() => {
        const fetchCertifiers = async () => {
            if (!program) return;
            try {
                const [authorityPda] = getAuthorityPda();
                const authority = await (program.account as any).certificationAuthority.fetch(authorityPda);

                // Get list of authorized pubkeys
                const approvedKeys = authority.approvedCertifiers as PublicKey[];

                // Fetch profiles for each
                const profiles: CertifierInfo[] = [];
                for (const key of approvedKeys) {
                    const [profilePda] = getCertifierProfilePda(key);
                    try {
                        const profile = await (program.account as any).certifierProfile.fetch(profilePda);
                        profiles.push({
                            publicKey: key,
                            displayName: profile.displayName,
                            physicalAddress: profile.physicalAddress,
                            currentLoad: profile.currentLoad,
                            totalProcessed: profile.totalProcessed.toNumber() // u64 to number
                        });
                    } catch (e) {
                        console.warn(`Profile not found for ${key.toString()}`, e);
                        // Fallback if profile missing (should not happen in prod)
                        profiles.push({
                            publicKey: key,
                            displayName: `Certif. ${key.toString().slice(0, 4)}`,
                            physicalAddress: "N/A",
                            currentLoad: 0,
                            totalProcessed: 0
                        });
                    }
                }
                setCertifiers(profiles);
                // Pre-select the first one (or the one with lowest load later)
                if (profiles.length > 0) {
                    setFormData(prev => ({ ...prev, targetCertifier: profiles[0].publicKey.toString() }));
                }
            } catch (err) {
                console.error("Error fetching certifiers:", err);
            } finally {
                setLoadingCertifiers(false);
            }
        };

        fetchCertifiers();
    }, [program, getAuthorityPda, getCertifierProfilePda]);

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

        if (!formData.targetCertifier) {
            setError("Veuillez selectionner un certificateur.");
            return;
        }

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
            const targetPubkey = new PublicKey(formData.targetCertifier);
            const selectedCertifierInfo = certifiers.find(c => c.publicKey.toString() === formData.targetCertifier);

            const metadataResult = await createMetadata({
                serialNumber: formData.serialNumber,
                brand: formData.brand,
                model: formData.model,
                certType: formData.certType,
                estimatedValue: parseInt(formData.estimatedValue),
                imageUri: imageUri || undefined,
                owner: publicKey.toBase58(),
                certifier: selectedCertifierInfo?.displayName || "Unknown"
            });

            metadataUri = metadataResult.metadataUri;

            // Step 3: Request certification on blockchain
            setStep('blockchain');
            const [authorityPda] = getAuthorityPda();
            const [requestPda] = getRequestPda(formData.serialNumber);
            const [certifierProfilePda] = getCertifierProfilePda(targetPubkey);

            const authority = await (program.account as any).certificationAuthority.fetch(authorityPda);
            const treasuryPubkey = authority.treasury;

            const certTypeArg = { [formData.certType]: {} };

            // NEW: includes targetCertifier arg and certifierProfile account
            const tx = await (program.methods as any)
                .requestCertification(
                    formData.serialNumber,
                    formData.brand,
                    formData.model,
                    certTypeArg,
                    new BN(parseInt(formData.estimatedValue)),
                    metadataUri,
                    targetPubkey // Argument added in V2 logic
                )
                .accounts({
                    requester: publicKey,
                    authority: authorityPda,
                    request: requestPda,
                    certifierProfile: certifierProfilePda, // Added account
                    treasury: treasuryPubkey,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            setSuccess(`Demande envoyee avec succes ! TX: ${tx.slice(0, 16)}...`);

            // Reset form
            setFormData(prev => ({
                ...prev,
                serialNumber: '',
                brand: '',
                model: '',
                // Keep type and certifier
                estimatedValue: '',
            }));
            handleRemoveImage();

            // Allow user to see success message for a bit, then reset state if needed?
            // For now keep as is.

        } catch (err: any) {
            console.error('Erreur demande certification:', err);
            if (err.message?.includes('RequestAlreadyExists')) {
                setError('Une demande existe deja pour ce numero de serie.');
            } else if (err.message?.includes('CertifierAtCapacity')) {
                setError('Ce certificateur est surcharge. Veuillez en choisir un autre.');
            } else if (err.message?.includes('SerialNumberTooLong')) {
                setError('Numero de serie trop long.');
            } else {
                setError(err.message || 'Erreur lors de la demande.');
            }
        } finally {
            setLoading(false);
            setStep('idle');
        }
    };

    const selectedType = CERT_TYPES[formData.certType];
    const selectedCertifier = certifiers.find(c => c.publicKey.toString() === formData.targetCertifier);

    const getStepLabel = () => {
        switch (step) {
            case 'uploading': return 'Upload image vers IPFS...';
            case 'metadata': return 'Creation des metadonnees...';
            case 'blockchain': return 'Envoi de la demande...';
            default: return 'Envoyer la Demande (Paiement)';
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-3">
                <div className="bg-blue-500/20 p-3 rounded-full">
                    <Send className="text-blue-500" size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-semibold text-white tracking-tight">Demander une Certification</h2>
                    <p className="text-sm text-slate-500">Soumettez votre montre pour expertise</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Certifier Selection */}
                <div className="space-y-3">
                    <label className="text-xs text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <UserCheck size={12} /> Choix du Certificateur (Expert)
                    </label>

                    {loadingCertifiers ? (
                        <div className="text-slate-500 text-sm animate-pulse">Chargement des experts...</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {certifiers.map((cert) => (
                                <div
                                    key={cert.publicKey.toString()}
                                    onClick={() => setFormData(prev => ({ ...prev, targetCertifier: cert.publicKey.toString() }))}
                                    className={clsx(
                                        "cursor-pointer p-4 rounded-xl border border-white/10 transition-all hover:bg-white/5 relative",
                                        formData.targetCertifier === cert.publicKey.toString()
                                            ? "bg-blue-500/10 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                                            : "bg-white/5"
                                    )}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-semibold text-white">{cert.displayName}</h4>
                                        {cert.currentLoad >= 10 && (
                                            <span className="text-[10px] bg-red-500/20 text-red-500 px-2 py-0.5 rounded-full">SATURE</span>
                                        )}
                                    </div>
                                    <div className="space-y-1 text-xs text-slate-400">
                                        <div className="flex justify-between">
                                            <span>Adresse:</span>
                                            <span className="text-white truncate max-w-[150px]">{cert.physicalAddress}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Traités:</span>
                                            <span className="text-blue-400 font-mono">{cert.totalProcessed}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Charge:</span>
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                    <div
                                                        className={clsx("h-full rounded-full", cert.currentLoad > 8 ? "bg-red-500" : "bg-green-500")}
                                                        style={{ width: `${(cert.currentLoad / 10) * 100}%` }}
                                                    />
                                                </div>
                                                <span>{cert.currentLoad}/10</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

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
                                    ? "border-blue-500 bg-blue-500/10"
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
                        <ImageIcon size={12} /> Photo de la montre (Recommande)
                    </label>

                    {!imagePreview ? (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500/50 transition-colors"
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
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                    </div>
                </div>

                {/* Fee Info */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex justify-between items-center">
                    <div>
                        <div className="text-xs text-slate-500 uppercase">Frais a payer</div>
                        <div className="text-lg font-bold text-blue-500">{selectedType.feeLabel}</div>
                    </div>
                    {selectedCertifier && (
                        <div className="text-center md:text-left mx-4 hidden md:block">
                            <div className="text-xs text-slate-500 uppercase">Expert choisi</div>
                            <div className="text-sm font-semibold text-white">{selectedCertifier.displayName}</div>
                        </div>
                    )}
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
                    disabled={loading || !publicKey || !formData.targetCertifier}
                    className="w-full luxury-button !py-4 !text-base flex items-center justify-center gap-3 disabled:opacity-50 !bg-blue-600 hover:!bg-blue-700"
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" size={20} />
                            {getStepLabel()}
                        </>
                    ) : (
                        <>
                            <Send size={20} />
                            Envoyer la Demande (Paiement)
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};
