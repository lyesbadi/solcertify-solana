import { useEffect, useState } from 'react';
import { useSolCertify } from '../hooks/useSolCertify';
import { Watch, Calendar, Lock, History, ExternalLink } from 'lucide-react';

export const UserCertificates = () => {
    const { program, wallet } = useSolCertify();
    const [certificates, setCertificates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchUserCerts() {
            if (!program || !wallet) return;
            try {
                // Fetch certificates where owner is the current wallet
                const certs = await program.account.certificate.all([
                    {
                        memcmp: {
                            offset: 8 + 4 + 50 + 4 + 30 + 4 + 50 + 1 + 8, // serial(string) + brand(string) + model(string) + type(enum) + value(u64)
                            // Wait, let's check the account layout in IDL
                            // Certificate fields:
                            // serialNumber: string (4 + max_len)
                            // brand: string (4 + max_len)
                            // model: string (4 + max_len)
                            // certType: enum (1)
                            // estimatedValue: u64 (8)
                            // metadataUri: string (4 + max_len)
                            // owner: pubkey (32)
                            // ...
                            // Memcmp is tricky with strings. Better fetch all and filter or use clever offset.
                            bytes: wallet.publicKey.toBase58(),
                        }
                    }
                ]);

                // Simpler way for now: fetch all and filter in JS if memory allows, 
                // but for a real app, offset is better.
                // Let's use the .all() without complex memcmp for the demo or fix the offset.
                const allCerts = await program.account.certificate.all();
                const userCerts = allCerts.filter(c => c.account.owner.equals(wallet.publicKey));

                setCertificates(userCerts);
            } catch (error) {
                console.error("Error fetching user certificates:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchUserCerts();
    }, [program, wallet]);

    if (loading) return <div className="text-center py-10 text-slate-500">Chargement de votre collection...</div>;

    if (certificates.length === 0) {
        return (
            <div className="luxury-card py-20 text-center flex flex-col items-center gap-4 border-dashed">
                <Watch className="text-slate-700" size={48} />
                <div className="space-y-1">
                    <h3 className="text-white font-semibold">Aucun certificat trouvé</h3>
                    <p className="text-slate-500 text-sm">Vous ne possédez pas encore de montre certifiée sur SolCertify.</p>
                </div>
            </div>
        );
    }

    return (
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
    );
};
