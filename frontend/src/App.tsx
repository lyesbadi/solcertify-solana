import { useState } from 'react';
import { Navbar } from './components/Navbar';
import { AuthorityInfo } from './components/AuthorityInfo';
import { UserCertificates } from './components/UserCertificates';
import { VerifyWatch } from './components/VerifyWatch';
import { useWallet } from '@solana/wallet-adapter-react';
import { Fingerprint, Search, ShieldCheck, Watch } from 'lucide-react';
import { clsx } from 'clsx';

type TabType = 'verify' | 'my-watches' | 'admin';

function App() {
    const { connected } = useWallet();
    const [activeTab, setActiveTab] = useState<TabType>('verify');

    return (
        <div className="min-h-screen bg-dark-gradient selection:bg-gold-500/30">
            <Navbar activeTab={activeTab} onTabChange={setActiveTab} />

            <main className="max-w-7xl mx-auto px-6 py-12 space-y-12">
                {/* Header / Tabs */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-extrabold text-white tracking-tight leading-tight">
                            Tableau de bord <span className="text-gold-gradient">SolCertify</span>
                        </h1>
                        <p className="text-slate-500 text-sm">Registre d'authenticité horloger de luxe sur Solana.</p>
                    </div>

                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                        <button
                            onClick={() => setActiveTab('verify')}
                            className={clsx(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                                activeTab === 'verify' ? "bg-gold-gradient text-white shadow-gold-glow" : "text-slate-400 hover:text-white"
                            )}
                        >
                            <Search size={16} /> Vérifier
                        </button>
                        <button
                            onClick={() => setActiveTab('my-watches')}
                            className={clsx(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                                activeTab === 'my-watches' ? "bg-gold-gradient text-white shadow-gold-glow" : "text-slate-400 hover:text-white"
                            )}
                        >
                            <Watch size={16} /> Mes Montres
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Main Content Area */}
                    <div className="lg:col-span-2 space-y-12">
                        {activeTab === 'verify' && (
                            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <VerifyWatch />
                            </section>
                        )}

                        {activeTab === 'my-watches' && (
                            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {!connected ? (
                                    <div className="luxury-card py-20 text-center flex flex-col items-center gap-4 border-dashed">
                                        <Fingerprint className="text-slate-700" size={48} />
                                        <div className="space-y-1">
                                            <h3 className="text-white font-semibold">Wallet requis</h3>
                                            <p className="text-slate-500 text-sm">Veuillez connecter votre wallet pour accéder à votre collection.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-3">
                                            <ShieldCheck className="text-gold-500" size={24} />
                                            <h2 className="text-xl font-semibold text-white tracking-tight">Ma Collection Certifiée</h2>
                                        </div>
                                        <UserCertificates />
                                    </div>
                                )}
                            </section>
                        )}

                        {/* Global Stats always visible at the bottom of the main col */}
                        <div className="pt-12 border-t border-white/5">
                            <AuthorityInfo />
                        </div>
                    </div>

                    {/* Sidebar / Info */}
                    <aside className="space-y-6">
                        <div className="luxury-card h-full flex flex-col items-center justify-center text-center p-8 border-gold-500/10 bg-gold-500/[0.01]">
                            <div className="bg-gold-500/10 p-4 rounded-full mb-4">
                                <ShieldCheck className="text-gold-500" size={32} />
                            </div>
                            <h4 className="text-white font-semibold mb-2 text-lg">Sécurité Blockchain</h4>
                            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                                Chaque certificat est unique et immuable. Le numéro de série est lié à jamais à votre identité blockchain.
                            </p>
                            <div className="w-full space-y-3">
                                <div className="flex justify-between text-[10px] uppercase tracking-wider font-bold text-slate-400 p-2 bg-white/5 rounded-lg">
                                    <span>Réseau</span>
                                    <span className="text-gold-500 font-mono">Localhost</span>
                                </div>
                                <div className="flex justify-between text-[10px] uppercase tracking-wider font-bold text-slate-400 p-2 bg-white/5 rounded-lg">
                                    <span>Frais Certification</span>
                                    <span className="text-gold-500 font-mono">0.05 - 0.5 SOL</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                            <h4 className="text-white font-medium text-sm">Prochaines étapes</h4>
                            <ul className="space-y-3">
                                <li className="flex gap-3 text-xs text-slate-500">
                                    <span className="w-5 h-5 rounded-full bg-gold-500/20 text-gold-500 flex items-center justify-center shrink-0">1</span>
                                    Finaliser l'interface d'émission pour les certificateurs.
                                </li>
                                <li className="flex gap-3 text-xs text-slate-500">
                                    <span className="w-5 h-5 rounded-full bg-white/10 text-slate-400 flex items-center justify-center shrink-0">2</span>
                                    Intégrer le service IPFS pour les photos haute résolution.
                                </li>
                            </ul>
                        </div>
                    </aside>
                </div>
            </main>

            <footer className="mt-20 border-t border-white/5 py-12 text-center text-slate-600 text-[10px] uppercase tracking-[0.2em] font-medium">
                <p>© 2026 SolCertify - Protocole de Certification pour l'Horlogerie de Luxe</p>
            </footer>
        </div>
    );
}

export default App;
