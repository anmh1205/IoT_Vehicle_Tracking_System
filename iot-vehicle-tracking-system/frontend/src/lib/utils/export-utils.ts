/**
 * Export Utilities - Convert data to CSV format
 */

/**
 * Convert an array of objects to CSV string
 */
export function arrayToCSV<T extends Record<string, unknown>>(
    data: T[],
    columns?: { key: keyof T; header: string }[]
): string {
    if (data.length === 0) return '';

    // If no columns specified, use all keys from first item
    const cols = columns || Object.keys(data[0]).map((key) => ({
        key: key as keyof T,
        header: key,
    }));

    // Create header row
    const header = cols.map((col) => `"${String(col.header)}"`).join(',');

    // Create data rows
    const rows = data.map((item) =>
        cols
            .map((col) => {
                const value = item[col.key];
                if (value === null || value === undefined) return '""';
                if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
                if (value instanceof Date) return `"${value.toISOString()}"`;
                return `"${String(value)}"`;
            })
            .join(',')
    );

    return [header, ...rows].join('\n');
}

/**
 * Download data as a CSV file
 */
export function downloadCSV(
    csvContent: string,
    filename: string = 'export.csv'
): void {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}

/**
 * Export data directly to CSV file
 */
export function exportToCSV<T extends Record<string, unknown>>(
    data: T[],
    filename: string,
    columns?: { key: keyof T; header: string }[]
): void {
    const csvContent = arrayToCSV(data, columns);
    downloadCSV(csvContent, filename);
}
