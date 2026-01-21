import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Watch, ShieldCheck } from 'lucide-react';

export const Navbar = () => {
    return (
        <nav className="sticky top-0 z-50 glass border-b border-white/5 px-6 py-4">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                <div className="flex items-center gap-2 group cursor-pointer">
                    <div className="bg-gold-gradient p-2 rounded-lg group-hover:rotate-12 transition-transform duration-300">
                        <Watch className="text-white" size={24} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xl font-bold tracking-tighter text-white">
                            SOL<span className="text-gold-500">CERTIFY</span>
                        </span>
                        <span className="text-[10px] uppercase tracking-[0.2em] text-gold-500/80 font-medium">
                            Luxury Authentication
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-6 text-sm font-medium text-slate-400">
                    <a href="#" className="hover:text-gold-400 transition-colors">Vérifier</a>
                    <a href="#" className="hover:text-gold-400 transition-colors">Mes Montres</a>
                    <a href="#" className="hover:text-gold-400 transition-colors">Certificateurs</a>

                    <div className="h-6 w-px bg-white/10 mx-2" />

                    <WalletMultiButton className="luxury-button" />
                </div>
            </div>
        </nav>
    );
};
