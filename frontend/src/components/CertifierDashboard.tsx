import { useEffect, useState } from 'react';
import { useSolCertify } from '../hooks/useSolCertify';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import {
    CheckCircle,
    XCircle,
    Clock,
    Loader2,
    Eye,
    Award,
    Watch
} from 'lucide-react';
import { clsx } from 'clsx';
import { BN } from '@coral-xyz/anchor';

interface CertificationRequest {
    publicKey: PublicKey;
    account: {
        requester: PublicKey;
        serialNumber: string;
        brand: string;
        model: string;
        certType: any;
        estimatedValue: BN;
        metadataUri: string;
        status: { pending?: {}, approved?: {}, rejected?: {} };
        assignedCertifier: PublicKey | null;
        rejectionReason: string;
        createdAt: BN;
        resolvedAt: BN;
        feePaid: BN;
    };
}

// Subcomponent to fetch image from Metadata JSON
const MetadataImage = ({ uri }: { uri: string }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchImage = async () => {
            if (!uri) {
                setLoading(false);
                return;
            }

            // Convert any IPFS uri to gateway
            const gatewayUrl = uri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');

            // If it looks like a direct image link
            if (gatewayUrl.match(/\.(jpeg|jpg|gif|png)$/) != null) {
                setImageUrl(gatewayUrl);
                setLoading(false);
                return;
            }

            try {
                // Otherwise assume it's a JSON metadata file
                const res = await fetch(gatewayUrl);
                const json = await res.json();
                if (json.image) {
                    setImageUrl(json.image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/'));
                }
            } catch (e) {
                console.error("Error loading metadata image", e);
            } finally {
                setLoading(false);
            }
        };
        fetchImage();
    }, [uri]);

    if (loading) return <div className="w-full h-full bg-white/5 animate-pulse flex items-center justify-center"><Loader2 className="animate-spin text-slate-600" size={16} /></div>;

    if (!imageUrl) return <Watch className="text-slate-600" />;

    return (
        <img
            src={imageUrl}
            alt="Watch"
            className="w-full h-full object-cover transition-opacity duration-500"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
    );
};

export const CertifierDashboard = () => {
    const { program, getAuthorityPda, getUserActivityPda, getCertificatePda, getCertifierProfilePda } = useSolCertify();
    const { publicKey } = useWallet();

    const [requests, setRequests] = useState<CertificationRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'pending' | 'history'>('pending');

    // Approval/Rejection Modal State
    const [selectedRequest, setSelectedRequest] = useState<CertificationRequest | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);

    // Filter logic update
    const [isAdmin, setIsAdmin] = useState(false);

    const fetchRequests = async () => {
        if (!program || !publicKey) return;
        setLoading(true);
        try {
            // Check if current user is admin
            const [authorityPda] = getAuthorityPda();
            const authority = await (program.account as any).certificationAuthority.fetch(authorityPda);
            const adminKey = authority.admin as PublicKey;
            const isUserAdmin = adminKey.toString() === publicKey.toString();
            setIsAdmin(isUserAdmin);

            const allRequests = await (program.account as any).certificationRequest.all();

            // Filter requests:
            // 1. If Admin: See ALL requests
            // 2. If Certifier: See ONLY requests assigned to ME (or unassigned/free-for-all if that logic existed)
            // Current Logic V2: Requests MUST be assigned. So filtered by assignedCertifier === publicKey.

            const relevantRequests = allRequests.filter((req: any) => {
                const assigned = req.account.assignedCertifier;

                // If admin, show everything
                if (isUserAdmin) return true;

                // If regular certifier, show only assigned to me
                if (assigned && assigned.toString() === publicKey.toString()) {
                    return true;
                }

                return false;
            });

            // Sort by date desc
            const sorted = relevantRequests.sort((a: any, b: any) =>
                b.account.createdAt.toNumber() - a.account.createdAt.toNumber()
            );

            setRequests(sorted as unknown as CertificationRequest[]);
        } catch (error) {
            console.error("Error fetching requests:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, [program, publicKey]);

    const handleApprove = async (request: CertificationRequest) => {
        if (!program || !publicKey) return;
        setProcessingId(request.publicKey.toBase58());

        try {
            const [authorityPda] = getAuthorityPda();
            const [certificatePda] = getCertificatePda(request.account.serialNumber);
            const [ownerActivityPda] = getUserActivityPda(request.account.requester);

            // Need certifier profile to update stats
            // NOTE: In V2, the certifier signer MUST be the assigned certifier.
            // If Admin is forcing approval, they must be the assigned certifier OR the contract allows admin override (which our contract does NOT currently explicitely allow for 'approve', only 'admin' role in init/add/remove). 
            // WAIT - 'approve_certification' checks `constraint = request.assigned_certifier == certifier.key()`.
            // So ONLY the assigned certifier can approve. Even Admin cannot approve if not assigned.

            // We need the CertifierProfile PDA to update stats
            // The currently connected user IS the certifier (checked by constraint)
            const [certifierProfilePda] = getCertifierProfilePda(publicKey);

            // Fetch authority to get treasury
            const authority = await (program.account as any).certificationAuthority.fetch(authorityPda);
            const treasuryPubkey = authority.treasury;

            const tx = await (program.methods as any)
                .approveCertification()
                .accounts({
                    certifier: publicKey,
                    certifierProfile: certifierProfilePda, // Added in V2
                    request: request.publicKey,
                    authority: authorityPda,
                    certificate: certificatePda,
                    ownerActivity: ownerActivityPda,
                    treasury: treasuryPubkey,
                    systemProgram: SystemProgram.programId // Use explicitly imported/resolved SystemProgram if available, or rely on Anchor default
                })
                .rpc();

            console.log("Approved signature:", tx);
            await fetchRequests();
            setSelectedRequest(null);
            setActionType(null);
        } catch (error) {
            console.error("Error approving:", error);
            alert("Erreur lors de l'approbation");
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (request: CertificationRequest) => {
        if (!program || !publicKey || !rejectReason) return;
        setProcessingId(request.publicKey.toBase58());

        try {
            const [authorityPda] = getAuthorityPda();
            // Rejection also updates stats now? No, rejection just frees up the slot.
            // Wait, yes, reject_certification decrement current_load in V2?
            // Let's check the rust code... It calls `certifier_profile.current_load -= 1`.
            // So we NEED certifierProfile account.

            const [certifierProfilePda] = getCertifierProfilePda(publicKey);

            const tx = await (program.methods as any)
                .rejectCertification(rejectReason)
                .accounts({
                    certifier: publicKey,
                    certifierProfile: certifierProfilePda, // Added in V2
                    request: request.publicKey,
                    requester: request.account.requester,
                    authority: authorityPda,
                    systemProgram: SystemProgram.programId
                })
                .rpc();

            console.log("Rejected signature:", tx);
            await fetchRequests();
            setSelectedRequest(null);
            setActionType(null);
            setRejectReason('');
        } catch (error) {
            console.error("Error rejecting:", error);
            alert("Erreur lors du rejet");
        } finally {
            setProcessingId(null);
        }
    };

    const filteredRequests = requests.filter(req => {
        const isPending = !!req.account.status.pending;
        if (filter === 'pending') return isPending;
        if (filter === 'history') return !isPending;
        return true;
    });

    const getStatusBadge = (status: any) => {
        if (status.pending) return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-500 rounded text-xs">En Attente</span>;
        if (status.approved) return <span className="px-2 py-1 bg-green-500/20 text-green-500 rounded text-xs">Approuve</span>;
        if (status.rejected) return <span className="px-2 py-1 bg-red-500/20 text-red-500 rounded text-xs">Rejete</span>;
        return null;
    };

    const getCertTypeLabel = (certType: any) => {
        if (certType.standard) return 'Standard';
        if (certType.premium) return 'Premium';
        if (certType.luxury) return 'Luxury';
        if (certType.exceptional) return 'Exceptional';
        return 'Inconnu';
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        Tableau de Bord Certificateur
                        {isAdmin && (
                            <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider font-bold shadow-red-glow">
                                Admin Mode
                            </span>
                        )}
                    </h2>
                    <p className="text-sm text-slate-500">Gerez les demandes de certification entrantes</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter('pending')}
                        className={clsx("px-4 py-2 rounded-lg text-sm transition-colors", filter === 'pending' ? "bg-gold-500 text-black shadow-gold-glow" : "bg-white/5 text-slate-400 hover:bg-white/10")}
                    >
                        En Attente
                    </button>
                    <button
                        onClick={() => setFilter('history')}
                        className={clsx("px-4 py-2 rounded-lg text-sm transition-colors", filter === 'history' ? "bg-gold-500 text-black shadow-gold-glow" : "bg-white/5 text-slate-400 hover:bg-white/10")}
                    >
                        Historique
                    </button>
                    <button
                        onClick={fetchRequests}
                        className="p-2 bg-white/5 rounded-lg text-slate-400 hover:text-white"
                    >
                        <Clock size={20} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <Loader2 className="animate-spin mx-auto text-gold-500 mb-4" size={32} />
                    <p className="text-slate-500">Chargement des demandes...</p>
                </div>
            ) : filteredRequests.length === 0 ? (
                <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
                    <div className="bg-white/5 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Award className="text-slate-600" size={32} />
                    </div>
                    <p className="text-slate-400">Aucune demande trouvée</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredRequests.map((req) => (
                        <div key={req.publicKey.toBase58()} className="bg-white/5 border border-white/10 rounded-xl p-6 transition-all hover:border-white/20">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-black/40 rounded-lg flex items-center justify-center overflow-hidden">
                                        <MetadataImage uri={req.account.metadataUri} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-white text-lg">{req.account.brand} {req.account.model}</span>
                                            {getStatusBadge(req.account.status)}
                                        </div>
                                        <div className="text-sm text-slate-400 font-mono">SN: {req.account.serialNumber}</div>
                                        <div className="text-xs text-slate-500 mt-1">
                                            Demande par: {req.account.requester.toBase58().substring(0, 6)}...
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-gold-500 font-bold">{getCertTypeLabel(req.account.certType)}</div>
                                    <div className="text-xs text-slate-500 mt-1">Valeur est.: {req.account.estimatedValue.toString()} EUR</div>
                                </div>
                            </div>

                            {/* Metadata Link */}
                            <div className="mb-4 text-xs">
                                <a
                                    href={req.account.metadataUri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                                >
                                    <Eye size={12} /> Voir Metadata JSON
                                </a>
                            </div>

                            {/* Actions */}
                            {!!req.account.status.pending && (
                                <div className="flex gap-3 mt-4 pt-4 border-t border-white/10">
                                    {selectedRequest?.publicKey.toBase58() === req.publicKey.toBase58() ? (
                                        <div className="w-full">
                                            {actionType === 'approve' ? (
                                                <div className="space-y-3">
                                                    <p className="text-sm text-white">Confirmer l'approbation et l'emission du certificat ?</p>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleApprove(req)}
                                                            disabled={!!processingId}
                                                            className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg text-sm flex items-center justify-center gap-2"
                                                        >
                                                            {processingId ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                                                            Confirmer Emission
                                                        </button>
                                                        <button
                                                            onClick={() => { setSelectedRequest(null); setActionType(null); }}
                                                            className="bg-white/10 text-white py-2 px-4 rounded-lg text-sm"
                                                        >
                                                            Annuler
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <p className="text-sm text-white">Motif du rejet (remboursement automatique):</p>
                                                    <input
                                                        type="text"
                                                        value={rejectReason}
                                                        onChange={(e) => setRejectReason(e.target.value)}
                                                        placeholder="Ex: Photos floues, contrefaçon..."
                                                        className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-sm text-white"
                                                    />
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleReject(req)}
                                                            disabled={!!processingId || !rejectReason}
                                                            className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                                                        >
                                                            {processingId ? <Loader2 className="animate-spin" size={16} /> : <XCircle size={16} />}
                                                            Rejeter la demande
                                                        </button>
                                                        <button
                                                            onClick={() => { setSelectedRequest(null); setActionType(null); }}
                                                            className="bg-white/10 text-white py-2 px-4 rounded-lg text-sm"
                                                        >
                                                            Annuler
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => { setSelectedRequest(req); setActionType('approve'); }}
                                                className="flex-1 bg-green-500/10 text-green-500 border border-green-500/20 py-2 rounded-lg text-sm font-medium hover:bg-green-500/20 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <CheckCircle size={16} /> Approuver
                                            </button>
                                            <button
                                                onClick={() => { setSelectedRequest(req); setActionType('reject'); setRejectReason(''); }}
                                                className="flex-1 bg-red-500/10 text-red-500 border border-red-500/20 py-2 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <XCircle size={16} /> Rejeter
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}

                            {req.account.status.rejected && (
                                <div className="mt-4 pt-4 border-t border-white/10 text-sm text-red-400">
                                    <span className="font-semibold">Raison du rejet :</span> {req.account.rejectionReason}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
