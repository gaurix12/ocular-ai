import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePredictionContext } from '../context/PredictionContext';
import axiosInstance from '../api/axios';
import ResultCard from '../components/ResultCard';

export default function Results() {
    const { prediction } = usePredictionContext();
    const navigate = useNavigate();

    useEffect(() => {
        if (!prediction) {
            navigate('/upload');
        }
    }, [prediction, navigate]);

    const handleDownload = async () => {
        if (!prediction?.id && !prediction?.prediction_id) return;

        const id = prediction.id || prediction.prediction_id;
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
            console.error('Report download failed', err);
            alert('Failed to download report. Please try again from historical records.');
        }
    };

    if (!prediction) return null;

    return (
        <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-2">Screening Results</h2>
                    <p className="text-slate-400">Analysis completed using IrisAI Clinical Model v1.0</p>
                </div>
                <button
                    onClick={() => navigate('/upload')}
                    className="btn-secondary text-sm"
                >
                    ← Run New Analysis
                </button>
            </div>

            <ResultCard
                prediction={prediction}
                onDownloadReport={handleDownload}
            />

            <div className="mt-12 p-6 glass-card border-none bg-blue-600/10">
                <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                    <span>⚡</span> What's next?
                </h4>
                <p className="text-slate-300 text-sm leading-relaxed">
                    Your results are saved in your clinical history. You can access the PDF reports at any time.
                    If your risk level is <strong>Medium</strong> or <strong>High</strong>, we recommend scheduling
                    a follow-up with a medical professional immediately.
                </p>
            </div>
        </div>
    );
}
