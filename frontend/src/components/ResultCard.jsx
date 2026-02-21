import { formatPercent, getRiskBadgeClass } from '../utils/format';
import { CountingNumber } from './CountingNumber';
import ProgressBar from './ProgressBar';

export default function ResultCard({ prediction, onDownloadReport }) {
    if (!prediction) return null;

    return (
        <div className="glass-panel overflow-hidden slide-in">
            {/* Header: Core Diagnosis & Export */}
            <div className="p-10 border-b border-white/5 bg-white/[0.02]">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <span className="flex h-3 w-3 rounded-full bg-blue-500 animate-pulse"></span>
                            <span className="text-[10px] font-black tracking-[0.2em] text-blue-400 uppercase">Analysis Finalized</span>
                        </div>
                        <h2 className="text-hero text-4xl md:text-5xl text-white">
                            {prediction.top_disease}
                        </h2>
                        <div className="flex flex-wrap items-center gap-4 pt-2">
                            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${getRiskBadgeClass(prediction.risk_level)}`}>
                                {prediction.risk_level} Risk Level
                            </div>
                            <div className="h-4 w-px bg-white/10 hidden sm:block"></div>
                            <div className="flex items-center gap-2">
                                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Confidence:</span>
                                <span className="text-white font-mono font-bold flex items-center">
                                    <CountingNumber
                                        number={prediction.confidence * 100}
                                        decimalPlaces={1}
                                        className="text-white"
                                    />
                                    <span className="ml-0.5">%</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    <button onClick={onDownloadReport} className="btn-clinical btn-clinical-primary w-full lg:w-auto px-8 py-4 shadow-[0_15px_30px_rgba(59,130,246,0.2)]">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="uppercase tracking-widest text-xs">Export Clinical PDF</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-0">
                {/* Probability Distribution Section */}
                <div className="xl:col-span-5 p-10 border-b xl:border-b-0 xl:border-r border-white/5">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-10 flex items-center gap-3">
                        <span className="p-2 rounded-lg bg-white/5">📊</span>
                        Probability Distribution
                    </h3>
                    <div className="space-y-10">
                        {Object.entries(prediction.all_scores)
                            .sort(([, a], [, b]) => b - a)
                            .map(([disease, score], index) => (
                                <div key={disease} className="group cursor-default">
                                    <div className="flex justify-between items-end mb-4">
                                        <span className={`text-sm font-bold tracking-tight transition-all duration-300 ${disease === prediction.top_disease ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'}`}>
                                            {disease}
                                        </span>
                                        <span className="text-xs font-mono text-slate-500 font-bold flex items-center">
                                            <CountingNumber
                                                number={score * 100}
                                                decimalPlaces={1}
                                                delay={index * 150}
                                            />
                                            <span className="ml-0.5">%</span>
                                        </span>
                                    </div>
                                    <ProgressBar
                                        width={score * 100}
                                        delay={index * 150}
                                        isHighlight={disease === prediction.top_disease}
                                    />
                                </div>
                            ))}
                    </div>
                </div>

                {/* Recommendation & Practitioner Notes */}
                <div className="xl:col-span-7 p-10 bg-black/5">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white tracking-tight">Practitioner Insights</h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Generated Clinical Recommendation</p>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500/50 to-transparent rounded-full" />
                        <div className="p-8 rounded-[1.5rem] bg-white/[0.03] border border-white/5">
                            <p className="text-slate-300 leading-relaxed text-lg font-medium italic">
                                "{prediction.recommendation}"
                            </p>
                        </div>
                    </div>

                    <div className="mt-12 flex items-start gap-4 p-6 rounded-2xl bg-orange-500/5 border border-orange-500/10 backdrop-blur-sm">
                        <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 font-black text-lg flex-shrink-0 border border-orange-500/20">
                            !
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em]">Diagnostic Disclaimer</h4>
                            <p className="text-xs text-orange-400/70 leading-relaxed font-bold">
                                This autonomous screening protocol is for laboratory reference only. All findings must be validated by a board-certified ophthalmic surgeon using traditional slit-lamp biomicroscopy.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
