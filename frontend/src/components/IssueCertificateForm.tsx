import { useState } from 'react';
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
    Link as LinkIcon
} from 'lucide-react';
import { clsx } from 'clsx';

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
        description: 'Montres < 5 000 €',
        color: 'bg-blue-500',
    },
    premium: {
        label: 'Premium',
        fee: 0.1,
        feeLabel: '0.1 SOL',
        description: '5 000 € - 20 000 €',
        color: 'bg-purple-500',
    },
    luxury: {
        label: 'Luxury',
        fee: 0.25,
        feeLabel: '0.25 SOL',
        description: '20 000 € - 100 000 €',
        color: 'bg-gold-500',
    },
    exceptional: {
        label: 'Exceptional',
        fee: 0.5,
        feeLabel: '0.5 SOL',
        description: '> 100 000 €',
        color: 'bg-red-500',
    },
};

export const IssueCertificateForm = () => {
    const { program, getAuthorityPda, getCertificatePda, getUserActivityPda } = useSolCertify();
    const { publicKey } = useWallet();

    const [formData, setFormData] = useState({
        serialNumber: '',
        brand: '',
        model: '',
        certType: 'standard' as CertificationType,
        estimatedValue: '',
        metadataUri: '',
        ownerAddress: '',
    });

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!program || !publicKey) return;

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const ownerPubkey = new PublicKey(formData.ownerAddress);
            const [authorityPda] = getAuthorityPda();
            const [certificatePda] = getCertificatePda(formData.serialNumber);
            const [ownerActivityPda] = getUserActivityPda(ownerPubkey);

            // Fetch treasury from authority account
            const authority = await (program.account as any).certificationAuthority.fetch(authorityPda);
            const treasuryPubkey = authority.treasury;

            // Build the certType object for Anchor
            const certTypeArg = { [formData.certType]: {} };

            const tx = await (program.methods as any)
                .issueCertificate(
                    formData.serialNumber,
                    formData.brand,
                    formData.model,
                    certTypeArg,
                    new BN(parseInt(formData.estimatedValue)),
                    formData.metadataUri
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

            setSuccess(`Certificat émis avec succès ! TX: ${tx.slice(0, 16)}...`);

            // Reset form
            setFormData({
                serialNumber: '',
                brand: '',
                model: '',
                certType: 'standard',
                estimatedValue: '',
                metadataUri: '',
                ownerAddress: '',
            });
        } catch (err: any) {
            console.error('Erreur émission certificat:', err);
            if (err.message?.includes('UnauthorizedCertifier')) {
                setError('Vous n\'êtes pas un certificateur agréé.');
            } else if (err.message?.includes('MaxCertificatesReached')) {
                setError('Le propriétaire a atteint la limite de 4 certificats.');
            } else {
                setError(err.message || 'Erreur lors de l\'émission du certificat.');
            }
        } finally {
            setLoading(false);
        }
    };

    const selectedType = CERT_TYPES[formData.certType];

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-3">
                <div className="bg-gold-500/20 p-3 rounded-full">
                    <Award className="text-gold-500" size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-semibold text-white tracking-tight">Émettre un Certificat</h2>
                    <p className="text-sm text-slate-500">Réservé aux certificateurs agréés</p>
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

                {/* Form Fields */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Hash size={12} /> Numéro de Série
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
                            <FileText size={12} /> Modèle
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
                            <Euro size={12} /> Valeur Estimée (EUR)
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
                            <User size={12} /> Adresse du Propriétaire (Wallet Solana)
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

                    <div className="col-span-2 space-y-2">
                        <label className="text-xs text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <LinkIcon size={12} /> URI Métadonnées IPFS
                        </label>
                        <input
                            type="text"
                            name="metadataUri"
                            value={formData.metadataUri}
                            onChange={handleChange}
                            placeholder="ipfs://QmYourMetadataHash"
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
                        <div className="text-xs text-slate-500 uppercase">Type sélectionné</div>
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
                            Émission en cours...
                        </>
                    ) : (
                        <>
                            <Award size={20} />
                            Émettre le Certificat
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};
