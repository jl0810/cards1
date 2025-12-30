import { cn } from "@/lib/utils";

interface LogoProps {
    className?: string;
    showText?: boolean;
}

export function CSSLogo({ className, showText = true }: LogoProps) {
    return (
        <div className={cn("flex flex-col sm:flex-row items-center gap-6", className)}>
            <div className="relative h-12 w-20 flex-shrink-0">
                {/* Background Card 3 (Bottom) */}
                <div className="absolute top-0 right-0 w-16 h-10 bg-slate-200/20 rounded-md transform rotate-12 translate-x-3 -translate-y-3 border border-white/5 shadow-sm" />

                {/* Background Card 2 (Middle) */}
                <div className="absolute top-0 right-0 w-16 h-10 bg-slate-300/40 rounded-md transform rotate-6 translate-x-2 -translate-y-2 border border-white/10 shadow-md" />

                {/* Primary Card (Top) - Dark with chip */}
                <div className="absolute inset-0 w-20 h-12 bg-[#1E293B] rounded-lg border border-slate-700 shadow-2xl flex flex-col justify-between p-2 transform -rotate-2 overflow-hidden group">
                    {/* Card Shine Effect */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                    {/* Card Chip (Gold-ish) */}
                    <div className="w-4 h-3 bg-[#FDE68A]/80 rounded-[1px] relative shadow-inner">
                        <div className="absolute inset-0 border-[0.2px] border-black/10" />
                        <div className="absolute top-1/2 left-0 w-full h-[0.1px] bg-black/5" />
                        <div className="absolute top-0 left-1/2 w-[0.1px] h-full bg-black/5" />
                    </div>

                    {/* Card Number Dots */}
                    <div className="flex justify-between items-end leading-none">
                        <div className="flex gap-1">
                            <span className="text-[6px] text-white/40 tracking-widest">••••</span>
                            <span className="text-[6px] text-white/40 tracking-widest">••••</span>
                        </div>
                        <span className="text-[7px] font-mono text-white/50 tracking-tighter italic mr-1">5678</span>
                    </div>
                </div>
            </div>

            {/* Brand Text */}
            {showText && (
                <div className="flex flex-col items-center sm:items-start select-none">
                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] leading-none">
                        Cards <span className="text-white/80">Gone</span> Crazy
                    </h2>
                    <div className="h-0.5 w-full bg-gradient-to-r from-cyan-500 to-transparent mt-1 opacity-50" />
                </div>
            )}
        </div>
    );
}
