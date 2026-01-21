import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Watch } from 'lucide-react';
import { clsx } from 'clsx';

interface NavbarProps {
    activeTab: string;
    onTabChange: (tab: any) => void;
}

export const Navbar = ({ activeTab, onTabChange }: NavbarProps) => {
    return (
        <nav className="sticky top-0 z-50 glass border-b border-white/5 px-6 py-4">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                <div
                    className="flex items-center gap-2 group cursor-pointer"
                    onClick={() => onTabChange('verify')}
                >
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

                <div className="flex items-center gap-8 text-sm font-medium">
                    <button
                        onClick={() => onTabChange('verify')}
                        className={clsx(
                            "transition-colors hover:text-gold-400",
                            activeTab === 'verify' ? "text-gold-500" : "text-slate-400"
                        )}
                    >
                        Vérifier
                    </button>
                    <button
                        onClick={() => onTabChange('my-watches')}
                        className={clsx(
                            "transition-colors hover:text-gold-400",
                            activeTab === 'my-watches' ? "text-gold-500" : "text-slate-400"
                        )}
                    >
                        Mes Montres
                    </button>
                    <button
                        onClick={() => onTabChange('admin')}
                        className={clsx(
                            "transition-colors hover:text-gold-400",
                            activeTab === 'admin' ? "text-gold-500" : "text-slate-400"
                        )}
                    >
                        Certificateurs
                    </button>

                    <div className="h-6 w-px bg-white/10 mx-2" />

                    <WalletMultiButton className="luxury-button" />
                </div>
            </div>
        </nav>
    );
};
