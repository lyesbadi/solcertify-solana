import { useEffect, useState } from 'react';
import { useSolCertify } from '../hooks/useSolCertify';
import { Watch, Calendar, Lock, History, ExternalLink, Clock, AlertCircle, CheckCircle, Timer } from 'lucide-react';
import { clsx } from 'clsx';
import { PublicKey } from '@solana/web3.js';

export const UserCertificates = () => {
    const { program, wallet } = useSolCertify();
    const [certificates, setCertificates] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
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

        fetchData();
    }, [program, wallet]);

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
                                    <div className="w-12 h-12 bg-black/40 rounded flex items-center justify-center overflow-hidden">
                                        {req.account.metadataUri.startsWith('ipfs://') ? (
                                            <img
                                                src={`https://gateway.pinata.cloud/ipfs/${req.account.metadataUri.replace('ipfs://', '')}`}
                                                alt="Watch"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <Watch className="text-slate-600" size={20} />
                                        )}
                                    </div>
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
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <div className="text-[10px] uppercase tracking-widest text-gold-500 font-bold mb-1">
                                                {Object.keys(data.certType)[0]}
                                            </div>
                                            <h3 className="text-xl font-bold text-white leading-tight">
                                                {data.brand} <span className="text-slate-400 font-medium">{data.model}</span>
                                            </h3>
                                            <p className="text-xs text-slate-500 font-mono mt-1">S/N: {data.serialNumber}</p>
                                        </div>
                                        <div className="bg-white/5 p-2 rounded-lg">
                                            <Watch className="text-gold-500" size={20} />
                                        </div>
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
                                        <button className="w-full mt-2 luxury-button !py-2 !text-sm">
                                            Transférer la Propriété
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
