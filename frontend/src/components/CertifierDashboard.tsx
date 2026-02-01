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
    UserCheck,
    MapPin,
    Activity
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

interface CertifierInfo {
    publicKey: PublicKey;
    displayName: string;
    physicalAddress: string;
    currentLoad: number;
    totalProcessed: number;
    isActive: boolean;
}

import { MetadataGallery } from './MetadataGallery';

export const CertifierDashboard = () => {
    const { program, getAuthorityPda, getUserActivityPda, getCertificatePda, getCertifierProfilePda } = useSolCertify();
    const { publicKey } = useWallet();

    const [requests, setRequests] = useState<CertificationRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'pending' | 'history'>('pending');

    // Certifiers List
    const [certifiers, setCertifiers] = useState<CertifierInfo[]>([]);
    const [loadingCertifiers, setLoadingCertifiers] = useState(true);

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



    const fetchCertifiers = async () => {
        if (!program) return;
        setLoadingCertifiers(true);
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
                        totalProcessed: profile.totalProcessed.toNumber(),
                        isActive: profile.isActive
                    });
                } catch (e) {
                    // Fallback
                    profiles.push({
                        publicKey: key,
                        displayName: `Certif. ${key.toString().slice(0, 4)}`,
                        physicalAddress: "N/A",
                        currentLoad: 0,
                        totalProcessed: 0,
                        isActive: true // Assume active if in authority list but profile missing (edge case)
                    });
                }
            }
            setCertifiers(profiles);
        } catch (err) {
            console.error("Error fetching certifiers:", err);
        } finally {
            setLoadingCertifiers(false);
        }
    };

    useEffect(() => {
        fetchRequests();
        fetchCertifiers();
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

            await (program.methods as any)
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

            // Fetch authority to get treasury
            const authority = await (program.account as any).certificationAuthority.fetch(authorityPda);
            const treasuryPubkey = authority.treasury;

            await (program.methods as any)
                .rejectCertification(rejectReason)
                .accounts({
                    certifier: publicKey,
                    certifierProfile: certifierProfilePda, // Added in V2
                    request: request.publicKey,
                    requester: request.account.requester,
                    authority: authorityPda,
                    treasury: treasuryPubkey,
                    systemProgram: SystemProgram.programId
                })
                .rpc();


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
                    <p className="text-slate-400">Aucune demande en attente</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredRequests.map((req) => {
                        const isAssignedToMe = req.account.assignedCertifier?.toString() === publicKey?.toString();

                        return (
                            <div key={req.publicKey.toBase58()} className="bg-white/5 border border-white/10 rounded-xl p-6 transition-all hover:border-white/20">
                                {/* Assignment Badge */}
                                {isAssignedToMe && req.account.status.pending && (
                                    <div className="mb-4 flex items-center gap-2 text-xs">
                                        <span className="bg-gold-500/20 text-gold-500 px-2 py-1 rounded-full font-semibold uppercase tracking-wider">
                                            📥 Assignée à vous
                                        </span>
                                        <span className="text-slate-500">— Cette demande nécessite votre attention</span>
                                    </div>
                                )}

                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-4">
                                        <MetadataGallery uri={req.account.metadataUri} size="md" />
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
                                        <div className="text-xs text-slate-600 mt-1">
                                            {new Date(req.account.createdAt.toNumber() * 1000).toLocaleDateString()}
                                        </div>
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
                        );
                    })}
                </div>
            )}

            {/* Certifiers List Section */}
            <div className="mt-12 border-t border-white/10 pt-8">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-6">
                    <UserCheck className="text-gold-500" size={20} />
                    Liste des Certificateurs Agréés ({certifiers.length})
                </h3>

                {loadingCertifiers ? (
                    <div className="text-center py-8">
                        <Loader2 className="animate-spin mx-auto text-slate-500" size={24} />
                    </div>
                ) : certifiers.length === 0 ? (
                    <div className="text-slate-500 text-sm text-center py-6 bg-white/5 rounded-lg border border-dashed border-white/10">
                        Aucun certificateur trouvé via l'autorité.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {certifiers.map((cert) => (
                            <div
                                key={cert.publicKey.toString()}
                                className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-colors"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h4 className="font-bold text-white text-base">{cert.displayName}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={clsx(
                                                "w-2 h-2 rounded-full",
                                                cert.isActive ? "bg-green-500" : "bg-red-500"
                                            )} />
                                            <span className="text-[10px] uppercase tracking-wider text-slate-400">
                                                {cert.isActive ? "Actif" : "Inactif"}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] text-slate-500 uppercase flex items-center justify-end gap-1">
                                            <Activity size={10} /> Traités
                                        </div>
                                        <div className="text-blue-400 font-mono font-bold text-lg leading-tight">
                                            {cert.totalProcessed}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-3 border-t border-white/5">
                                    <div className="flex items-start gap-2 text-sm text-slate-400">
                                        <MapPin className="text-slate-600 shrink-0 mt-0.5" size={14} />
                                        <span className="text-xs line-clamp-2">{cert.physicalAddress}</span>
                                    </div>

                                    <div className="bg-black/20 rounded-lg p-2 flex items-center justify-between text-xs">
                                        <span className="text-slate-500">Charge actuelle (Load)</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                <div
                                                    className={clsx("h-full rounded-full transition-all", cert.currentLoad > 8 ? "bg-red-500" : "bg-green-500")}
                                                    style={{ width: `${Math.min((cert.currentLoad / 10) * 100, 100)}%` }}
                                                />
                                            </div>
                                            <span className="text-white font-mono">{cert.currentLoad}/10</span>
                                        </div>
                                    </div>

                                    <div className="text-[10px] text-slate-600 font-mono break-all pt-1">
                                        Addr: {cert.publicKey.toString().slice(0, 12)}...{cert.publicKey.toString().slice(-4)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
