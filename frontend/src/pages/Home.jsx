import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Logo from '../components/Logo';
import { StarsBackground } from '../components/StarsBackground';
import { CountingNumber } from '../components/CountingNumber';

export default function Home() {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    return (
        <div className="relative isolate min-h-[calc(100vh-80px)] flex flex-col justify-center">
            {/* Dynamic Background VFX */}
            <div className="absolute inset-0 -z-10 overflow-hidden">
                {/* 1. The Stars Layer */}
                <StarsBackground
                    starColor="#3B82F6"
                    className="absolute inset-0 opacity-40"
                />

                {/* 2. Existing Blurred Orbs */}
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[60%] rounded-full bg-indigo-600/10 blur-[120px]" />

                {/* 3. Subtle Grid Overlay */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none" />
            </div>

            <div className="py-20 sm:py-24">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">

                        {/* Value Proposition (Left Column) */}
                        <div className="text-left space-y-10 slide-in">
                            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 backdrop-blur-md">
                                <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-ping"></span>
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Clinical Intelligence v1.0</span>
                            </div>

                            <div className="space-y-4">
                                <h1 className="text-hero text-6xl sm:text-7xl lg:text-8xl text-white">
                                    Precision <br />
                                    <span className="gradient-text uppercase">OCULAR AI</span>
                                </h1>
                                <p className="text-xl text-slate-400 leading-relaxed max-w-lg font-medium">
                                    Autonomous iris disease screening and diagnostic assistance.
                                    Leveraging deep neural networks for instant clinical insights.
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-6 pt-6">
                                <button
                                    onClick={() => navigate(isAuthenticated ? "/upload" : "/register")}
                                    className="btn-clinical btn-clinical-primary text-lg px-12 py-5 shadow-[0_20px_50px_rgba(59,130,246,0.3)] hover:scale-[1.03] active:scale-95 transition-all"
                                >
                                    Start Screening
                                </button>
                                <button
                                    onClick={() => navigate("/login")}
                                    className="group flex items-center gap-3 text-sm font-bold text-slate-300 hover:text-white transition-all"
                                >
                                    Workstation Login
                                    <span className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-all">
                                        →
                                    </span>
                                </button>
                            </div>

                            {/* Trust Badge / Info */}
                            <div className="pt-10 flex items-center gap-8 border-t border-white/5">
                                <div className="flex -space-x-3">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-950 bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400">
                                            {String.fromCharCode(64 + i)}
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-tight">
                                    Trusted by <br /><span className="text-slate-300">12 Global Institutions</span>
                                </p>
                            </div>
                        </div>

                        {/* Visual Hero (Right Column) - REFACTORED FOR CORRECTNESS */}
                        <div className="relative flex justify-center items-center lg:justify-end">

                            {/* Main Visual Container */}
                            <div className="relative w-full max-w-[500px] aspect-square">

                                {/* Decorative Outer Rings */}
                                <div className="absolute inset-0 rounded-[3rem] border border-white/5 rotate-3" />
                                <div className="absolute inset-0 rounded-[3rem] border border-white/5 -rotate-3" />

                                {/* The Clinical Scanner Card */}
                                <div className="absolute inset-4 glass-panel bg-slate-900/40 p-1 shadow-2xl overflow-hidden flex items-center justify-center">
                                    <div className="absolute inset-0 bg-blue-500/[0.03] pointer-events-none" />

                                    {/* Scanning Elements */}
                                    <div className="relative flex flex-col items-center justify-center">
                                        <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center">
                                            {/* Rotating Arcs */}
                                            <div className="absolute inset-0 rounded-full border-[1.5px] border-dashed border-white/10 animate-[spin_20s_linear_infinite]" />
                                            <div className="absolute inset-4 rounded-full border-[3px] border-transparent border-t-blue-500/40 border-r-blue-500/40 animate-[spin_4s_linear_infinite]" />
                                            <div className="absolute inset-8 rounded-full border-[1px] border-blue-500/10" />

                                            {/* Custom Logo in Scanner */}
                                            <div className="relative z-10 w-24 h-24 md:w-32 md:h-32 text-white drop-shadow-[0_0_30px_rgba(59,130,246,0.5)]">
                                                <Logo className="w-full h-full" />
                                            </div>
                                        </div>

                                        <div className="mt-8 flex flex-col items-center gap-4">
                                            <div className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] animate-pulse">
                                                Scanning Environment Active
                                            </div>
                                            <div className="h-1 w-32 bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500 w-3/4 animate-[pulse_2s_infinite]" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Floating Metrics - Integrated Positioning */}
                                <div className="absolute -top-6 -right-6 glass-panel px-6 py-4 bg-slate-950/80 backdrop-blur-xl border-white/10 shadow-2xl z-20 animate-bounce-slow">
                                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Inference Time</div>
                                    <div className="text-3xl font-black text-white tracking-tighter flex items-center gap-1">
                                        ~
                                        <CountingNumber
                                            number={0.42}
                                            fromNumber={0.00}
                                            decimalPlaces={2}
                                            className="text-white"
                                        />
                                        <span className="text-blue-500">s</span>
                                    </div>
                                </div>

                                <div className="absolute -bottom-6 -left-6 glass-panel px-6 py-3 bg-slate-950/80 backdrop-blur-xl border-white/10 shadow-2xl z-20">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)] animate-pulse" />
                                        <span className="text-[10px] font-bold text-white uppercase tracking-[0.15em]">Nodes Synchronized</span>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Bottom Stats Section */}
                    <div className="mt-32 pt-20 border-t border-white/5 grid grid-cols-2 md:grid-cols-4 gap-12 lg:gap-24 opacity-80 transition-opacity hover:opacity-100">
                        {[
                            { label: 'Patient Screenings', value: '8.2k' },
                            { label: 'Diagnostic Models', value: 'v4.2' },
                            { label: 'Global Uptime', value: '99.9%' },
                            { label: 'Latency Rate', value: '14ms' },
                        ].map(stat => (
                            <div key={stat.label} className="group cursor-default">
                                <div className="text-3xl lg:text-4xl font-black text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight">{stat.value}</div>
                                <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mt-2 group-hover:text-slate-400 transition-colors">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
