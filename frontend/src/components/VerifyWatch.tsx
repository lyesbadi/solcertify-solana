import { useState } from 'react';
import { useSolCertify } from '../hooks/useSolCertify';
import { Search, ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react';

export const VerifyWatch = () => {
    const { program, getCertificatePda } = useSolCertify();
    const [serial, setSerial] = useState('');
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!serial || !program) return;

        setLoading(true);
        setError('');
        setResult(null);

        try {
            const [pda] = getCertificatePda(serial);
            const certificate = await (program.account as any).certificate.fetch(pda);
            setResult(certificate);
        } catch (err: any) {
            console.error("Verification error:", err);
            setError("Aucune montre certifiée trouvée avec ce numéro de série.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold text-white tracking-tight">Vérifier l'Authenticité</h2>
                <p className="text-sm text-slate-500">Entrez le numéro de série gravé sur la montre pour consulter son certificat blockchain.</p>
            </div>

            <form onSubmit={handleVerify} className="relative group">
                <input
                    type="text"
                    value={serial}
                    onChange={(e) => setSerial(e.target.value.toUpperCase())}
                    placeholder="Ex: ROLEX-SUB-123456"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-all placeholder:text-slate-600"
                />
                <button
                    type="submit"
                    disabled={loading || !serial}
                    className="absolute right-2 top-2 bottom-2 px-6 rounded-xl bg-gold-gradient text-white font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2 shadow-gold-glow"
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                    Vérifier
                </button>
            </form>

            {error && (
                <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-4 text-red-400 animate-in fade-in slide-in-from-top-4">
                    <ShieldAlert size={24} />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {result && (
                <div className="luxury-card border-gold-500/30 bg-gold-500/[0.02] animate-in zoom-in-95 duration-500">
                    <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/5">
                        <div className="bg-gold-500/20 p-3 rounded-full">
                            <ShieldCheck className="text-gold-500" size={32} />
                        </div>
                        <div>
                            <div className="text-xs font-bold text-gold-500 uppercase tracking-widest">Montre Certifiée Authentique</div>
                            <div className="text-2xl font-bold text-white leading-tight">
                                {result.brand} <span className="text-slate-400 font-medium">{result.model}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-y-6">
                        <div>
                            <div className="text-[10px] text-slate-500 uppercase mb-1">Type de certification</div>
                            <div className="text-white font-semibold">{Object.keys(result.certType)[0]}</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-slate-500 uppercase mb-1">Valeur estimée</div>
                            <div className="text-white font-semibold">{result.estimatedValue.toString()} EUR</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-slate-500 uppercase mb-1">Propriétaire Actuel</div>
                            <div className="text-slate-300 font-mono text-[10px] truncate max-w-[120px]">{result.owner.toBase58()}</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-slate-500 uppercase mb-1">Certificateur agréé</div>
                            <div className="text-slate-300 font-mono text-[10px] truncate max-w-[120px]">{result.certifier.toBase58()}</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
