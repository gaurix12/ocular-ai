import React, { useState, useEffect } from 'react';

export const CountingNumber = ({
    number,
    fromNumber = 0,
    duration = 2000,
    delay = 0,
    decimalPlaces = 0,
    decimalSeparator = ".",
    padStart = false,
    className = ""
}) => {
    const [displayValue, setDisplayValue] = useState(fromNumber);

    useEffect(() => {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp - delay) / duration, 1);

            if (progress < 0) {
                requestAnimationFrame(step);
                return;
            }

            const current = progress * (number - fromNumber) + fromNumber;
            setDisplayValue(current);

            if (progress < 1) {
                requestAnimationFrame(step);
            }
        };

        const timeoutId = setTimeout(() => {
            requestAnimationFrame(step);
        }, delay);

        return () => clearTimeout(timeoutId);
    }, [number, fromNumber, duration, delay]);

    const formatted = displayValue.toLocaleString(undefined, {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
    }).replace(".", decimalSeparator);

    return (
        <span className={className}>
            {formatted}
        </span>
    );
};
