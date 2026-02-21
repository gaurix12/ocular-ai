/**
 * Format an ISO date string into a human-readable format.
 */
export function formatDate(isoString) {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * Format a float (0–1) as a percentage string.
 */
export function formatPercent(value) {
    if (value === null || value === undefined) return '—';
    return `${(value * 100).toFixed(1)}%`;
}

/**
 * Get Tailwind-compatible class name for risk badge.
 */
export function getRiskBadgeClass(risk) {
    switch (risk) {
        case 'High': return 'badge-high';
        case 'Medium': return 'badge-medium';
        case 'Low': return 'badge-low';
        default: return '';
    }
}
