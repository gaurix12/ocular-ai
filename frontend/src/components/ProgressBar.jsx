import React, { useState, useEffect } from 'react';

export default function ProgressBar({ width, delay = 0, isHighlight = false }) {
    const [currentWidth, setCurrentWidth] = useState(0);

    useEffect(() => {
        const timer = setTimeout(() => {
            setCurrentWidth(width);
        }, delay + 100);

        return () => clearTimeout(timer);
    }, [width, delay]);

    return (
        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden relative">
            <div
                className={`h-full rounded-full transition-all duration-1000 ease-out relative group ${isHighlight ? 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-slate-700 opacity-60'}`}
                style={{ width: `${currentWidth}%` }}
            >
                {/* Shimmer Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite] pointer-events-none" />
            </div>
        </div>
    );
}
