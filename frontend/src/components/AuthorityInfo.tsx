import { useEffect, useState } from 'react';
import { useSolCertify } from '../hooks/useSolCertify';
import { Shield, Award, Gem, Star, TrendingUp } from 'lucide-react';
import { clsx } from 'clsx';

export const AuthorityInfo = () => {
    const { program, getAuthorityPda } = useSolCertify();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            if (!program) return;
            try {
                const authorityAddr = getAuthorityPda();
                const authorityAccount = await program.account.certificationAuthority.fetch(authorityAddr);
                setStats(authorityAccount);
            } catch (error) {
                console.error("Error fetching authority stats:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchStats();
    }, [program, getAuthorityPda]);

    if (loading && !stats) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-32 bg-white/5 rounded-xl block" />
                ))}
            </div>
        );
    }

    if (!stats) return null;

    const cards = [
        { label: 'Standard', count: stats.standardCount.toString(), icon: Star, color: 'text-blue-400' },
        { label: 'Premium', count: stats.premiumCount.toString(), icon: Award, color: 'text-purple-400' },
        { label: 'Luxury', count: stats.luxuryCount.toString(), icon: Gem, color: 'text-gold-400' },
        { label: 'Exceptional', count: stats.exceptionalCount.toString(), icon: Shield, color: 'text-red-400' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <TrendingUp className="text-gold-500" size={24} />
                    <h2 className="text-xl font-semibold text-white tracking-tight">Vue d'ensemble du Registre</h2>
                </div>
                <div className="text-sm text-slate-400">
                    Total émis : <span className="text-white font-mono">{stats.totalIssued.toString()}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {cards.map((card) => (
                    <div key={card.label} className="luxury-card flex flex-col items-center justify-center gap-2 group">
                        <card.icon className={clsx(card.color, "group-hover:scale-110 transition-transform")} size={28} />
                        <div className="text-2xl font-bold text-white font-mono">{card.count}</div>
                        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{card.label}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};
