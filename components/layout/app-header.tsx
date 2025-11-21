import { Zap, BellRing } from "lucide-react";
import { ReactNode } from "react";

interface AppHeaderProps {
    children?: ReactNode;
}

export function AppHeader({ children }: AppHeaderProps) {
    return (
        <header className="pt-6 pb-4 px-5 sticky top-0 z-20 bg-dark-900/80 backdrop-blur-xl border-b border-white/5">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Zap className="text-white w-5 h-5" />
                    </div>
                    <h1 className="text-lg font-bold tracking-tight text-white">PointMax</h1>
                </div>
                <button className="relative p-2 hover:bg-white/5 rounded-full transition-colors">
                    <BellRing className="text-slate-400 w-5 h-5" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-dark-900"></span>
                </button>
            </div>
            {children && (
                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                    {children}
                </div>
            )}
        </header>
    );
}
