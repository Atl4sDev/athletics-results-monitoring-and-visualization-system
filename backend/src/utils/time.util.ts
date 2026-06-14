/**
 * Converts a text athletics time (e.g. "10.45", "2:04.12", "1:05:12.00")
 * to a numeric value in seconds for efficient and correct database sorting (Float).
 * Returns null for null/undefined input or any value that is not a parseable time.
 */
export const parseMarkToSortValue = (mark: string | null | undefined): number | null => {
    if (!mark) return null;

    const cleanMark = mark.trim();

    // Allow only digits, colons, and dots — rejects status strings like "DNF" or "DQ"
    // that may occasionally appear in the mark field.
    if (!/^[\d:\.]+$/.test(cleanMark)) {
        return null;
    }

    const parts = cleanMark.split(':');
    let totalSeconds = 0;

    try {
        if (parts.length === 1) {
            // SS.ss — sprint (e.g. "10.45")
            totalSeconds = parseFloat(parts[0]);
        } else if (parts.length === 2) {
            // MM:SS.ss — middle distance (e.g. "2:04.12")
            totalSeconds = parseInt(parts[0], 10) * 60 + parseFloat(parts[1]);
        } else if (parts.length === 3) {
            // HH:MM:SS.ss — race walk or marathon (e.g. "1:05:12.00")
            totalSeconds = parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseFloat(parts[2]);
        } else {
            return null;
        }

        if (isNaN(totalSeconds)) return null;

        // Round to 3 decimal places (milliseconds) to avoid JS floating-point drift
        // (e.g. 0.1 + 0.2 === 0.30000000000000004).
        return Number(totalSeconds.toFixed(3));

    } catch (error) {
        return null;
    }
};