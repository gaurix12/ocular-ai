import { createContext, useContext, useState, useCallback } from 'react';

const PredictionContext = createContext(null);

export function PredictionProvider({ children }) {
    const [prediction, setPrediction] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const storePrediction = useCallback((data) => {
        setPrediction(data);
        setError(null);
    }, []);

    const clearPrediction = useCallback(() => {
        setPrediction(null);
        setError(null);
    }, []);

    return (
        <PredictionContext.Provider
            value={{ prediction, loading, error, setLoading, setError, storePrediction, clearPrediction }}
        >
            {children}
        </PredictionContext.Provider>
    );
}

export function usePredictionContext() {
    const ctx = useContext(PredictionContext);
    if (!ctx) throw new Error('usePredictionContext must be used within PredictionProvider');
    return ctx;
}

export default PredictionContext;
