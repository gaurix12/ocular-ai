import { useCallback, useState } from 'react';

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'];

export default function UploadCard({ onFileSelected, onError, isLoading }) {
    const [dragActive, setDragActive] = useState(false);
    const [preview, setPreview] = useState(null);
    const [fileName, setFileName] = useState('');

    const handleFile = useCallback((file) => {
        if (!ALLOWED_TYPES.includes(file.type)) {
            onError('Invalid file format. Please use medical-grade JPG or PNG.');
            return;
        }
        if (file.size > MAX_SIZE) {
            onError('Sample size exceeds 5MB limit.');
            return;
        }
        setFileName(file.name);
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result);
        reader.readAsDataURL(file);
        onFileSelected(file);
        onError(null);
    }, [onFileSelected, onError]);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragActive(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
    }, [handleFile]);

    const handleChange = (e) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    };

    return (
        <div
            onDragEnter={() => setDragActive(true)}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`
        relative rounded-[2rem] border-2 border-dashed transition-all duration-500 overflow-hidden
        ${dragActive
                    ? 'border-blue-500 bg-blue-500/5 scale-[1.02] shadow-[0_0_40px_rgba(59,130,246,0.1)]'
                    : 'border-white/10 bg-slate-900/40 hover:border-white/20'
                }
        ${preview ? 'p-6' : 'p-20'}
      `}
        >
            <input
                id="file-input"
                type="file"
                accept="image/*"
                onChange={handleChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                disabled={isLoading}
            />

            {preview ? (
                <div className="text-center slide-in flex flex-col items-center">
                    <div className="relative group/preview">
                        <img
                            src={preview}
                            alt="Iris Sample"
                            className="max-h-72 rounded-2xl object-cover shadow-2xl border border-white/10 transition-transform group-hover/preview:scale-[1.02]"
                        />
                        <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover/preview:opacity-100 rounded-2xl transition-opacity pointer-events-none" />
                    </div>
                    <div className="mt-6 px-4 py-2 rounded-full bg-slate-800/80 border border-white/5 flex items-center gap-3">
                        <span className="text-blue-400">🔬</span>
                        <span className="text-xs font-bold text-slate-300 truncate max-w-[200px]">{fileName}</span>
                    </div>
                    <p className="mt-4 text-xs font-bold text-blue-500 uppercase tracking-widest animate-pulse">
                        Ready for Clinical Analysis
                    </p>
                </div>
            ) : (
                <div className="text-center pointer-events-none flex flex-col items-center">
                    <div className={`
            w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10
            border border-blue-500/20 flex items-center justify-center text-4xl mb-8
            shadow-[0_0_30px_rgba(59,130,246,0.05)] transition-all duration-500
            ${dragActive ? 'rotate-12 scale-110' : ''}
          `}>
                        📸
                    </div>
                    <h3 className="text-2xl font-black text-white mb-2 tracking-tight">
                        {dragActive ? 'Drop Sample Here' : 'Submit Iris Sample'}
                    </h3>
                    <p className="text-slate-400 text-sm max-w-[280px] leading-relaxed">
                        Drag clinical photography or <span className="text-blue-400 font-bold">browse workstation</span>
                    </p>
                    <div className="mt-8 flex gap-3">
                        {['JPG', 'PNG', 'WEBP'].map(ext => (
                            <span key={ext} className="px-2 py-1 rounded bg-white/5 border border-white/5 text-[10px] font-black text-slate-500">{ext}</span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
