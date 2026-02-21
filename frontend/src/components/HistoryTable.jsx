import { formatDate, formatPercent, getRiskBadgeClass } from '../utils/format';

export default function HistoryTable({ data, onRowClick }) {
    if (!data || data.length === 0) {
        return (
            <div className="text-center py-32 glass-panel border-dashed p-10">
                <div className="text-7xl mb-6 opacity-30">📁</div>
                <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Archives Empty</h3>
                <p className="text-slate-500 max-w-sm mx-auto text-sm leading-relaxed">
                    Screening history will manifest here once clinical analysis is performed on submitted samples.
                </p>
            </div>
        );
    }

    return (
        <div className="glass-panel overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white/[0.02]">
                            <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5">Session Date</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5">Diagnostic Label</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5">Accuracy</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5">Risk Priority</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5 text-right">Reference</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {data.map((item) => (
                            <tr
                                key={item.id}
                                className="group hover:bg-white/[0.03] transition-colors cursor-pointer"
                                onClick={() => onRowClick(item)}
                            >
                                <td className="px-8 py-6 whitespace-nowrap">
                                    <span className="text-sm font-bold text-slate-400 group-hover:text-blue-400 transition-colors">
                                        {formatDate(item.created_at)}
                                    </span>
                                </td>
                                <td className="px-8 py-6">
                                    <span className="text-base font-black text-white tracking-tight">
                                        {item.top_disease}
                                    </span>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500" style={{ width: `${item.confidence * 100}%` }} />
                                        </div>
                                        <span className="text-xs font-mono font-bold text-slate-500">
                                            {formatPercent(item.confidence)}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${getRiskBadgeClass(item.risk_level)}`}>
                                        {item.risk_level}
                                    </span>
                                </td>
                                <td className="px-8 py-6 text-right">
                                    <button className="text-[10px] font-black uppercase tracking-widest text-blue-500 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                        Review →
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
