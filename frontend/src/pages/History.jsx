import { useState, useEffect } from 'react';
import axiosInstance from '../api/axios';
import HistoryTable from '../components/HistoryTable';
import ResultCard from '../components/ResultCard';

export default function History() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPrediction, setSelectedPrediction] = useState(null);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const resp = await axiosInstance.get('/api/v1/predictions');
            setHistory(resp.data.data);
        } catch (err) {
            setError('Could not load history. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (id) => {
        try {
            const response = await axiosInstance.get(`/api/v1/report/${id}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Iris_Report_${id.slice(0, 8)}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            alert('Failed to download report.');
        }
    };

    return (
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6">
            <div className="mb-10">
                <h2 className="text-3xl font-bold text-white mb-2">Clinical History</h2>
                <p className="text-slate-400">View and manage all past iris screening reports</p>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="spinner" />
                </div>
            ) : error ? (
                <div className="p-8 text-center bg-red-500/10 border border-red-500/50 rounded-2xl text-red-500">
                    {error}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-10">
                    <HistoryTable
                        data={history}
                        onRowClick={(item) => setSelectedPrediction(item)}
                    />
                </div>
            )}

            {/* Detail Modal Overlay */}
            {selectedPrediction && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
                    <div
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                        onClick={() => setSelectedPrediction(null)}
                    />
                    <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto glass-card border shadow-2xl slide-in">
                        <div className="sticky top-0 right-0 p-4 flex justify-end z-10">
                            <button
                                onClick={() => setSelectedPrediction(null)}
                                className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-6 md:p-8 pt-0">
                            <ResultCard
                                prediction={selectedPrediction}
                                onDownloadReport={() => handleDownload(selectedPrediction.id)}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
