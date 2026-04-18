/**
 * Format a Date to Indonesian locale string.
 */
export function formatDateID(date) {
    return new Date(date).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

/**
 * Get current period string (YYYY-MM).
 */
export function getCurrentPeriod() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Check if a date is overdue (past current time).
 */
export function isOverdue(date) {
    return new Date(date) < new Date();
}
