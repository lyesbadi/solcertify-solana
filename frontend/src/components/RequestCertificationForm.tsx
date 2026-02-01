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
    UserCheck,
    Camera,
    Package
} from 'lucide-react';
import { clsx } from 'clsx';
import { uploadImages, createMetadata } from '../services/ipfs';

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

// Deduce certificate type from estimated value
const getCertTypeFromValue = (value: number): CertificationType => {
    if (value >= 100000) return 'exceptional';
    if (value >= 20000) return 'luxury';
    if (value >= 5000) return 'premium';
    return 'standard';
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
        estimatedValue: '',
        targetCertifier: '', // User selection
        certificationMethod: 'remote' as 'remote' | 'physical', // remote (photos) or physical (shipping)
    });

    // Certifiers
    const [certifiers, setCertifiers] = useState<CertifierInfo[]>([]);
    const [loadingCertifiers, setLoadingCertifiers] = useState(true);

    // Multi-image support (max 5)
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [imageUris, setImageUris] = useState<string[]>([]);

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
                // Pre-select the first one ONLY if no certifier is already selected
                if (profiles.length > 0) {
                    setFormData(prev => {
                        // Only set if empty (user hasn't selected yet)
                        if (!prev.targetCertifier) {
                            return { ...prev, targetCertifier: profiles[0].publicKey.toString() };
                        }
                        return prev;
                    });
                }
            } catch (err) {

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
        const files = e.target.files;
        if (files && files.length > 0) {
            // Limit to 5 images total
            const newFiles = Array.from(files).slice(0, 5 - imageFiles.length);
            setImageFiles(prev => [...prev, ...newFiles].slice(0, 5));

            // Generate previews
            newFiles.forEach(file => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    setImagePreviews(prev => [...prev, e.target?.result as string].slice(0, 5));
                };
                reader.readAsDataURL(file);
            });
            setImageUris([]);
        }
    };

    const handleRemoveImage = (index: number) => {
        setImageFiles(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
        setImageUris(prev => prev.filter((_, i) => i !== index));
    };

    const handleRemoveAllImages = () => {
        setImageFiles([]);
        setImagePreviews([]);
        setImageUris([]);
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

        // Require photos for remote certification
        if (formData.certificationMethod === 'remote' && imageFiles.length === 0) {
            setError("Veuillez ajouter au moins une photo pour la certification à distance.");
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            let metadataUri = '';

            // Step 1: Upload images if provided
            let uploadedUris: string[] = imageUris;
            if (imageFiles.length > 0 && imageUris.length === 0) {
                setStep('uploading');
                const uploadResult = await uploadImages(imageFiles);
                uploadedUris = uploadResult.images.map(img => `ipfs://${img.hash}`);
                setImageUris(uploadedUris);
            }

            // Step 2: Create metadata on IPFS
            setStep('metadata');
            const targetPubkey = new PublicKey(formData.targetCertifier);
            const selectedCertifierInfo = certifiers.find(c => c.publicKey.toString() === formData.targetCertifier);

            // Compute cert type from estimated value
            const certType = getCertTypeFromValue(parseInt(formData.estimatedValue) || 0);

            const metadataResult = await createMetadata({
                serialNumber: formData.serialNumber,
                brand: formData.brand,
                model: formData.model,
                certType: certType,
                estimatedValue: parseInt(formData.estimatedValue),
                imageUris: uploadedUris.length > 0 ? uploadedUris : undefined,
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

            const certTypeArg = { [certType]: {} };

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
            handleRemoveAllImages();

            // Allow user to see success message for a bit, then reset state if needed?
            // For now keep as is.

        } catch (err: any) {

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

    // Compute cert type from estimated value (auto-deduced)
    const estimatedValueNum = parseFloat(formData.estimatedValue) || 0;
    const deducedCertType = getCertTypeFromValue(estimatedValueNum);
    const selectedType = CERT_TYPES[deducedCertType];
    const selectedCertifier = certifiers.find(c => c.publicKey.toString() === formData.targetCertifier);

    const getStepLabel = () => {
        switch (step) {
            case 'uploading': return `Upload ${imageFiles.length} image(s) vers IPFS...`;
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
                                        "cursor-pointer p-4 rounded-xl border border-white/10 transition-all hover:bg-white/5 z-10",
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

                {/* Auto-Deduced Type Display */}
                <div className="space-y-3">
                    <label className="text-xs text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        Type de Certificat
                        <span className="text-blue-400 font-normal normal-case">(déduit automatiquement du prix)</span>
                    </label>
                    <div className="grid grid-cols-4 gap-3">
                        {(Object.entries(CERT_TYPES) as [CertificationType, CertTypeInfo][]).map(([key, info]) => (
                            <div
                                key={key}
                                className={clsx(
                                    "p-4 rounded-xl border-2 transition-all text-center",
                                    deducedCertType === key
                                        ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30"
                                        : "border-white/10 bg-white/5 opacity-50"
                                )}
                            >
                                <div className={clsx("w-3 h-3 rounded-full mx-auto mb-2", info.color)} />
                                <div className="text-sm font-semibold text-white">{info.label}</div>
                                <div className="text-[10px] text-slate-500">{info.description}</div>
                                <div className="text-[10px] text-gold-500 mt-1">{info.feeLabel}</div>
                                {deducedCertType === key && (
                                    <div className="text-[10px] text-blue-400 mt-2 font-semibold">Selectionne</div>
                                )}
                            </div>
                        ))}
                    </div>
                    {estimatedValueNum > 0 && (
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-sm flex items-center gap-2">
                            <div className={clsx("w-3 h-3 rounded-full", selectedType.color)} />
                            <span className="text-blue-400">
                                Pour {estimatedValueNum.toLocaleString()} EUR → Certificat <strong>{selectedType.label}</strong> ({selectedType.feeLabel})
                            </span>
                        </div>
                    )}
                </div>

                {/* Certification Method Selection */}
                <div className="space-y-3">
                    <label className="text-xs text-slate-400 uppercase tracking-wider">
                        Mode de Certification
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                        {/* Remote / Photos Option */}
                        <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, certificationMethod: 'remote' }))}
                            className={clsx(
                                "p-4 rounded-xl border-2 transition-all text-left",
                                formData.certificationMethod === 'remote'
                                    ? "border-green-500 bg-green-500/10"
                                    : "border-white/10 bg-white/5 hover:border-white/20"
                            )}
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div className={clsx(
                                    "p-2 rounded-lg",
                                    formData.certificationMethod === 'remote' ? "bg-green-500/20" : "bg-white/10"
                                )}>
                                    <Camera size={20} className={formData.certificationMethod === 'remote' ? "text-green-500" : "text-slate-400"} />
                                </div>
                                <div>
                                    <div className="font-semibold text-white">Photos a distance</div>
                                    <div className="text-xs text-slate-400">Envoyez vos photos en ligne</div>
                                </div>
                            </div>
                            <ul className="text-[10px] text-slate-500 space-y-1 ml-12">
                                <li>• Rapide (24-48h)</li>
                                <li>• Pas de frais d'envoi</li>
                                <li>• Recommandé pour la plupart des montres</li>
                            </ul>
                        </button>

                        {/* Physical Delivery Option */}
                        <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, certificationMethod: 'physical' }))}
                            className={clsx(
                                "p-4 rounded-xl border-2 transition-all text-left",
                                formData.certificationMethod === 'physical'
                                    ? "border-amber-500 bg-amber-500/10"
                                    : "border-white/10 bg-white/5 hover:border-white/20"
                            )}
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div className={clsx(
                                    "p-2 rounded-lg",
                                    formData.certificationMethod === 'physical' ? "bg-amber-500/20" : "bg-white/10"
                                )}>
                                    <Package size={20} className={formData.certificationMethod === 'physical' ? "text-amber-500" : "text-slate-400"} />
                                </div>
                                <div>
                                    <div className="font-semibold text-white">Envoi physique</div>
                                    <div className="text-xs text-slate-400">Envoyez votre montre au certificateur</div>
                                </div>
                            </div>
                            <ul className="text-[10px] text-slate-500 space-y-1 ml-12">
                                <li>• Expertise approfondie</li>
                                <li>• Inspection physique complète</li>
                                <li>• Pour les pièces de haute valeur</li>
                            </ul>
                        </button>
                    </div>

                    {formData.certificationMethod === 'physical' && selectedCertifier && (
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm">
                            <div className="text-amber-500 font-medium mb-1">Adresse d'envoi:</div>
                            <div className="text-white">{selectedCertifier.displayName}</div>
                            <div className="text-slate-400 text-xs">{selectedCertifier.physicalAddress}</div>
                        </div>
                    )}
                </div>

                {/* Multi-Image Upload - Required for remote, optional for physical */}
                <div className="space-y-2">
                    <label className="text-xs text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <ImageIcon size={12} />
                        Photos de la montre ({imagePreviews.length}/5)
                        {formData.certificationMethod === 'remote' ? (
                            <span className="text-red-400 ml-1">*Requis</span>
                        ) : (
                            <span className="text-slate-600 ml-1">(Optionnel)</span>
                        )}
                    </label>

                    {/* Image Gallery Grid */}
                    <div className="grid grid-cols-5 gap-2">
                        {imagePreviews.map((preview, index) => (
                            <div key={index} className="relative aspect-square">
                                <img
                                    src={preview}
                                    alt={`Photo ${index + 1}`}
                                    className="w-full h-full object-cover rounded-lg border border-white/10"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleRemoveImage(index)}
                                    className="absolute -top-1 -right-1 p-0.5 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors"
                                >
                                    <X size={12} />
                                </button>
                                {imageUris[index] && (
                                    <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5 bg-green-500/80 rounded-b-lg text-[8px] text-white text-center">
                                        IPFS
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Add More Button (if less than 5) */}
                        {imagePreviews.length < 5 && (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="aspect-square border-2 border-dashed border-white/10 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/50 transition-colors"
                            >
                                <Upload className="text-slate-500 mb-1" size={20} />
                                <span className="text-[10px] text-slate-500">Ajouter</span>
                            </div>
                        )}
                    </div>

                    {/* Empty State */}
                    {imagePreviews.length === 0 && (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center cursor-pointer hover:border-blue-500/50 transition-colors"
                        >
                            <Upload className="mx-auto mb-3 text-slate-500" size={32} />
                            <p className="text-sm text-slate-400">Cliquez pour selectionner des photos</p>
                            <p className="text-xs text-slate-600 mt-1">Jusqu'a 5 images (JPG, PNG, WebP - max 10MB chacune)</p>
                        </div>
                    )}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
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
