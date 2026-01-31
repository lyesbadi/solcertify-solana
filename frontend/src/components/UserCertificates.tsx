import { useEffect, useState } from 'react';
import { useSolCertify } from '../hooks/useSolCertify';
import { Watch, Calendar, Lock, History, ExternalLink, Clock, AlertCircle, CheckCircle, Timer, Send, X, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { MetadataGallery } from './MetadataGallery';

export const UserCertificates = () => {
    const { program, wallet } = useSolCertify();
    const [certificates, setCertificates] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Transfer Modal State
    const [transferModal, setTransferModal] = useState<{ open: boolean; cert: any | null }>({ open: false, cert: null });
    const [recipientAddress, setRecipientAddress] = useState('');
    const [transferLoading, setTransferLoading] = useState(false);
    const [transferError, setTransferError] = useState('');
    const [transferSuccess, setTransferSuccess] = useState(false);

    useEffect(() => {
        fetchData();
    }, [program, wallet]);

    async function fetchData() {
        if (!program || !wallet) return;
        try {
            // Fetch User Certificates
            const allCerts = await (program.account as any).certificate.all();
            const userCerts = allCerts.filter((c: any) => c.account.owner.equals(wallet.publicKey));
            setCertificates(userCerts);

            // Fetch User Requests
            const allRequests = await (program.account as any).certificationRequest.all();
            const userRequests = allRequests.filter((r: any) => r.account.requester.equals(wallet.publicKey));

            // Sort requests: Pending first, then by date recent
            const sortedRequests = userRequests.sort((a: any, b: any) => {
                if (a.account.status.pending && !b.account.status.pending) return -1;
                if (!a.account.status.pending && b.account.status.pending) return 1;
                return b.account.createdAt.toNumber() - a.account.createdAt.toNumber();
            });

            setRequests(sortedRequests);

        } catch (error) {
            console.error("Error fetching user data:", error);
        } finally {
            setLoading(false);
        }
    }

    const openTransferModal = (cert: any) => {
        setTransferModal({ open: true, cert });
        setRecipientAddress('');
        setTransferError('');
        setTransferSuccess(false);
    };

    const closeTransferModal = () => {
        setTransferModal({ open: false, cert: null });
        setRecipientAddress('');
        setTransferError('');
        setTransferSuccess(false);
    };

    const handleTransfer = async () => {
        if (!program || !wallet || !transferModal.cert) return;

        setTransferLoading(true);
        setTransferError('');

        try {
            // Validate recipient address
            let recipientPubkey: PublicKey;
            try {
                recipientPubkey = new PublicKey(recipientAddress);
            } catch {
                throw new Error("Adresse Solana invalide");
            }

            // Cannot transfer to self
            if (recipientPubkey.equals(wallet.publicKey)) {
                throw new Error("Vous ne pouvez pas transférer à vous-même");
            }

            const serialNumber = transferModal.cert.account.serialNumber;

            // Derive PDAs
            const [certificatePda] = PublicKey.findProgramAddressSync(
                [Buffer.from("certificate"), Buffer.from(serialNumber)],
                program.programId
            );

            const [fromActivityPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("user_activity"), wallet.publicKey.toBuffer()],
                program.programId
            );

            const [toActivityPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("user_activity"), recipientPubkey.toBuffer()],
                program.programId
            );

            // Execute transfer
            const tx = await program.methods
                .transferCertificate()
                .accounts({
                    from: wallet.publicKey,
                    to: recipientPubkey,
                    certificate: certificatePda,
                    fromActivity: fromActivityPda,
                    toActivity: toActivityPda,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            console.log("Transfert réussi:", tx);
            setTransferSuccess(true);

            // Refresh data after 2 seconds
            setTimeout(() => {
                closeTransferModal();
                fetchData();
            }, 2000);

        } catch (error: any) {
            console.error("Erreur transfert:", error);

            // Parse error message
            let errorMsg = "Erreur lors du transfert";
            if (error.message) {
                if (error.message.includes("NotOwner")) {
                    errorMsg = "Vous n'êtes pas le propriétaire de ce certificat";
                } else if (error.message.includes("CertificateLocked")) {
                    errorMsg = "Le certificat est encore verrouillé";
                } else if (error.message.includes("CooldownNotElapsed")) {
                    errorMsg = "Veuillez attendre la fin du cooldown";
                } else if (error.message.includes("MaxCertificatesReached")) {
                    errorMsg = "Le destinataire a atteint la limite de 4 certificats";
                } else {
                    errorMsg = error.message;
                }
            }
            setTransferError(errorMsg);
        } finally {
            setTransferLoading(false);
        }
    };

    if (loading) return (
        <div className="flex justify-center py-20">
            <div className="animate-pulse text-gold-500 flex items-center gap-2">
                <Timer className="animate-spin" /> Chargement de la collection...
            </div>
        </div>
    );

    if (certificates.length === 0 && requests.length === 0) {
        return (
            <div className="luxury-card py-20 text-center flex flex-col items-center gap-4 border-dashed">
                <Watch className="text-slate-700" size={48} />
                <div className="space-y-1">
                    <h3 className="text-white font-semibold">Aucune collection</h3>
                    <p className="text-slate-500 text-sm">Vous n'avez aucun certificat ni demande en cours.</p>
                </div>
            </div>
        );
    }

    const getStatusBadge = (status: any) => {
        if (status.pending) return <span className="flex items-center gap-1 text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded text-xs"><Clock size={12} /> En Attente</span>;
        if (status.approved) return <span className="flex items-center gap-1 text-green-500 bg-green-500/10 px-2 py-1 rounded text-xs"><CheckCircle size={12} /> Approuvé</span>;
        if (status.rejected) return <span className="flex items-center gap-1 text-red-500 bg-red-500/10 px-2 py-1 rounded text-xs"><AlertCircle size={12} /> Rejeté</span>;
        return null;
    };

    return (
        <>
            <div className="space-y-12">
                {/* Requests Section */}
                {requests.length > 0 && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Timer className="text-slate-400" size={20} /> Demandes en cours
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                            {requests.map((req) => (
                                <div key={req.publicKey.toString()} className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center justify-between hover:bg-white/[0.07] transition-colors">
                                    <div className="flex items-center gap-4">
                                        <MetadataGallery uri={req.account.metadataUri} size="sm" />
                                        <div>
                                            <div className="text-white font-medium">{req.account.brand} {req.account.model}</div>
                                            <div className="text-xs text-slate-500 font-mono">SN: {req.account.serialNumber}</div>
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-1">
                                        {getStatusBadge(req.account.status)}
                                        {req.account.status.rejected && (
                                            <span className="text-xs text-red-400">{req.account.rejectionReason}</span>
                                        )}
                                        <span className="text-xs text-slate-600">
                                            {new Date(req.account.createdAt.toNumber() * 1000).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Certificates Section */}
                {certificates.length > 0 && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Watch className="text-slate-400" size={20} /> Certificats
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {certificates.map((cert) => {
                                const data = cert.account;
                                const isLocked = new Date().getTime() / 1000 < data.lockedUntil.toNumber();

                                return (
                                    <div key={cert.publicKey.toString()} className="luxury-card group overflow-hidden border-white/5 bg-[#1a1a1e]">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <div className="text-[10px] uppercase tracking-widest text-gold-500 font-bold mb-1">
                                                    {Object.keys(data.certType)[0]}
                                                </div>
                                                <h3 className="text-xl font-bold text-white leading-tight">
                                                    {data.brand} <span className="text-slate-400 font-medium">{data.model}</span>
                                                </h3>
                                                <p className="text-xs text-slate-500 font-mono mt-1">S/N: {data.serialNumber}</p>
                                            </div>
                                            <MetadataGallery uri={data.metadataUri} size="lg" />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-6">
                                            <div className="space-y-1">
                                                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                                                    <Calendar size={10} /> Émis le
                                                </div>
                                                <div className="text-sm text-slate-200">
                                                    {new Date(data.createdAt.toNumber() * 1000).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                                                    <Lock size={10} /> Statut
                                                </div>
                                                <div className={clsx(
                                                    "text-sm font-medium",
                                                    isLocked ? "text-red-400" : "text-green-400"
                                                )}>
                                                    {isLocked ? "Verrouillé" : "Transférable"}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button className="flex-1 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
                                                <History size={14} /> Historique
                                            </button>
                                            <button className="flex-1 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
                                                <ExternalLink size={14} /> Détails
                                            </button>
                                        </div>

                                        {!isLocked && (
                                            <button
                                                onClick={() => openTransferModal(cert)}
                                                className="w-full mt-2 luxury-button !py-2 !text-sm flex items-center justify-center gap-2"
                                            >
                                                <Send size={14} /> Transférer la Propriété
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Transfer Modal */}
            {transferModal.open && transferModal.cert && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1a1a1e] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-6">
                        {/* Header */}
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-white">Transférer le Certificat</h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    {transferModal.cert.account.brand} {transferModal.cert.account.model}
                                </p>
                            </div>
                            <button
                                onClick={closeTransferModal}
                                className="text-slate-500 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Certificate Info */}
                        <div className="bg-white/5 rounded-lg p-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Numéro de série</span>
                                <span className="text-white font-mono">{transferModal.cert.account.serialNumber}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Type</span>
                                <span className="text-gold-500 font-medium">
                                    {Object.keys(transferModal.cert.account.certType)[0]}
                                </span>
                            </div>
                        </div>

                        {/* Success State */}
                        {transferSuccess ? (
                            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
                                <CheckCircle className="text-green-500 mx-auto mb-2" size={32} />
                                <p className="text-green-400 font-medium">Transfert réussi !</p>
                                <p className="text-sm text-slate-500 mt-1">Le certificat a été transféré.</p>
                            </div>
                        ) : (
                            <>
                                {/* Recipient Input */}
                                <div className="space-y-2">
                                    <label className="text-sm text-slate-400">Adresse du destinataire</label>
                                    <input
                                        type="text"
                                        placeholder="Entrez l'adresse Solana..."
                                        value={recipientAddress}
                                        onChange={(e) => setRecipientAddress(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-gold-500/50 font-mono text-sm"
                                    />
                                </div>

                                {/* Error */}
                                {transferError && (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2 text-red-400 text-sm">
                                        <AlertCircle size={16} />
                                        {transferError}
                                    </div>
                                )}

                                {/* Warning */}
                                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-yellow-500 text-xs">
                                    Cette action est irreversible. Verifiez l'adresse avant de confirmer.
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={closeTransferModal}
                                        className="flex-1 bg-white/5 hover:bg-white/10 text-white font-semibold py-3 rounded-lg transition-colors"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        onClick={handleTransfer}
                                        disabled={!recipientAddress || transferLoading}
                                        className="flex-1 luxury-button !py-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {transferLoading ? (
                                            <>
                                                <Loader2 className="animate-spin" size={16} />
                                                Transfert...
                                            </>
                                        ) : (
                                            <>
                                                <Send size={16} />
                                                Confirmer
                                            </>
                                        )}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};
