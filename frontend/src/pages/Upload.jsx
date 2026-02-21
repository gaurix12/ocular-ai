import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axios';
import { usePredictionContext } from '../context/PredictionContext';
import UploadCard from '../components/UploadCard';

export default function Upload() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [error, setError] = useState(null);
    const { loading, setLoading, storePrediction } = usePredictionContext();
    const navigate = useNavigate();

    const handleUpload = async () => {
        if (!selectedFile) return;

        setLoading(true);
        setError(null);
        const formData = new FormData();
        formData.append('image', selectedFile);

        try {
            const response = await axiosInstance.post('/api/v1/predict', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            storePrediction(response.data.data);
            navigate('/results');
        } catch (err) {
            setError(err.response?.data?.message || 'The clinical server rejected the sample. Ensure image is clear.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto py-20 px-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-16">
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Sample Acquisition</span>
                    </div>
                    <h2 className="text-hero text-5xl text-white">Iris Screening</h2>
                    <p className="text-slate-400 text-lg max-w-md">
                        Submit a single high-resolution macro photograph of the ocular region for autonomous pathology assessment.
                    </p>
                </div>

                <div className="hidden lg:flex items-center gap-4 p-4 glass-panel border-none bg-white/[0.02]">
                    <div className="text-right">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Queue Status</div>
                        <div className="text-xs font-bold text-green-400">Normal Latency</div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                </div>
            </div>

            <div className="space-y-12">
                {error && (
                    <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-4 animate-in slide-in-from-top duration-300">
                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center font-bold">!</span>
                        {error}
                    </div>
                )}

                <div className="max-w-3xl mx-auto">
                    <UploadCard
                        onFileSelected={setSelectedFile}
                        onError={setError}
                        isLoading={loading}
                    />
                </div>

                <div className="flex flex-col items-center gap-8 pt-8">
                    <button
                        onClick={handleUpload}
                        disabled={!selectedFile || loading}
                        className="btn-clinical btn-clinical-primary py-5 px-16 text-lg tracking-tight group relative overflow-hidden"
                    >
                        {loading ? (
                            <div className="flex items-center gap-4">
                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                <span>Running Inference...</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4">
                                <span>⚡</span>
                                <span>Finalize Submission</span>
                                <span className="opacity-40 group-hover:translate-x-1 transition-transform">→</span>
                            </div>
                        )}
                    </button>

                    <div className="flex flex-wrap justify-center gap-12 pt-16 border-t border-white/5 w-full">
                        <div className="flex gap-4 items-start max-w-[200px]">
                            <div className="text-blue-500 font-black text-xl">01</div>
                            <p className="text-[11px] font-bold text-slate-500 uppercase leading-relaxed tracking-wider">Calibration: Ensure sample is centered and macro-focused.</p>
                        </div>
                        <div className="flex gap-4 items-start max-w-[200px]">
                            <div className="text-blue-500 font-black text-xl">02</div>
                            <p className="text-[11px] font-bold text-slate-500 uppercase leading-relaxed tracking-wider">Privacy: All clinical data is encrypted at the edge nodes.</p>
                        </div>
                        <div className="flex gap-4 items-start max-w-[200px]">
                            <div className="text-blue-500 font-black text-xl">03</div>
                            <p className="text-[11px] font-bold text-slate-500 uppercase leading-relaxed tracking-wider">Reporting: Instant PDF archival available upon completion.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
