/**
 * utils/formatter.js
 * All display-formatting logic lives here — currency, dates, times,
 * percentages, and small text helpers. Pages should never call
 * `.toFixed()`, `Intl.*`, or string-concat a "$" sign directly; route
 * everything through here so a locale/currency change is a one-line
 * edit in config.js instead of a find-and-replace across every page.
 */
// ---------------------------------------------------------------
// Currency
// ---------------------------------------------------------------

/**
 * Format a number as currency using CONFIG.FORMAT settings.
 * formatCurrency(4800) -> "$4,800.00"
 * formatCurrency(4800, { decimals: 0 }) -> "$4,800"
 * @param {number} amount
 * @param {{ decimals?: number }} [options]
 * @returns {string}
 */
function formatCurrency(amount, { decimals = 2 } = {}) {
    if (typeof amount !== 'number' || Number.isNaN(amount)) return '—';

    return new Intl.NumberFormat(CONFIG.FORMAT.locale, {
        style: 'currency',
        currency: CONFIG.FORMAT.currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(amount);
}

/**
 * Format a plain number with locale-aware thousands separators, no currency.
 * formatNumber(4800) -> "4,800"
 * @param {number} value
 * @returns {string}
 */
function formatNumber(value) {
    if (typeof value !== 'number' || Number.isNaN(value)) return '—';
    return new Intl.NumberFormat(CONFIG.FORMAT.locale).format(value);
}

/**
 * Format a 0–100 (or 0–1) value as a percentage string.
 * formatPercent(75) -> "75%"
 * formatPercent(0.75, { isFraction: true }) -> "75%"
 * @param {number} value
 * @param {{ isFraction?: boolean, decimals?: number }} [options]
 * @returns {string}
 */
function formatPercent(value, { isFraction = false, decimals = 0 } = {}) {
    if (typeof value !== 'number' || Number.isNaN(value)) return '—';
    const pct = isFraction ? value * 100 : value;
    return `${pct.toFixed(decimals)}%`;
}

// ---------------------------------------------------------------
// Dates & times
// ---------------------------------------------------------------

/**
 * Format a Date (or date string/timestamp) using CONFIG.FORMAT.dateStyle.
 * formatDate('2026-08-15') -> "Aug 15, 2026"
 * @param {Date|string|number} date
 * @returns {string}
 */
function formatDate(date) {
    const d = toDate(date);
    if (!d) return '—';
    return new Intl.DateTimeFormat(CONFIG.FORMAT.locale, {
        dateStyle: CONFIG.FORMAT.dateStyle,
    }).format(d);
}

/**
 * Format a Date/time using CONFIG.FORMAT.timeStyle.
 * formatTime('2026-08-15T09:00:00') -> "9:00 AM"
 * @param {Date|string|number} date
 * @returns {string}
 */
function formatTime(date) {
    const d = toDate(date);
    if (!d) return '—';
    return new Intl.DateTimeFormat(CONFIG.FORMAT.locale, {
        timeStyle: CONFIG.FORMAT.timeStyle,
    }).format(d);
}

/**
 * Format both date and time together.
 * formatDateTime('2026-08-15T09:00:00') -> "Aug 15, 2026, 9:00 AM"
 * @param {Date|string|number} date
 * @returns {string}
 */
function formatDateTime(date) {
    const d = toDate(date);
    if (!d) return '—';
    return new Intl.DateTimeFormat(CONFIG.FORMAT.locale, {
        dateStyle: CONFIG.FORMAT.dateStyle,
        timeStyle: CONFIG.FORMAT.timeStyle,
    }).format(d);
}

/**
 * Human-friendly relative day label, matching the "Tomorrow • 09:00 AM"
 * style used in the timetable/notices upcoming-item cards. Falls back to
 * a plain formatted date once it's more than a day out in either direction.
 * relativeDayLabel('2026-07-14') -> "Tomorrow" (if today is 2026-07-13)
 * relativeDayLabel('2026-07-13') -> "Today"
 * relativeDayLabel('2026-07-12') -> "Yesterday"
 * @param {Date|string|number} date
 * @returns {string}
 */
function relativeDayLabel(date) {
    const d = toDate(date);
    if (!d) return '—';

    const startOf = (dt) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    const dayMs = 24 * 60 * 60 * 1000;
    const diffDays = Math.round((startOf(d) - startOf(new Date())) / dayMs);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    return formatDate(d);
}

/**
 * Safely coerce a Date, ISO string, or timestamp into a Date instance.
 * Returns null for anything invalid instead of an "Invalid Date" object,
 * so every formatter above can just check for null once.
 * @param {Date|string|number} input
 * @returns {Date|null}
 */
function toDate(input) {
    const d = input instanceof Date ? input : new Date(input);
    return Number.isNaN(d.getTime()) ? null : d;
}

// ---------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------

/**
 * Capitalize the first letter of a string. Used for turning constants.js
 * enum values (e.g. 'present', 'pending') into display labels on the fly.
 * capitalize('present') -> "Present"
 * @param {string} str
 * @returns {string}
 */
function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Truncate long text with an ellipsis, keeping whole words where possible.
 * truncate('React Development Fundamentals', 10) -> "React…"
 * @param {string} str
 * @param {number} maxLength
 * @returns {string}
 */
function truncate(str, maxLength = 40) {
    if (!str || str.length <= maxLength) return str || '';
    const sliced = str.slice(0, maxLength);
    const lastSpace = sliced.lastIndexOf(' ');
    return `${sliced.slice(0, lastSpace > 0 ? lastSpace : maxLength)}…`;
}

/**
 * Turn "Alamgir Khan" into "AK" — matches the sidebar profile-avatar
 * initials treatment used across every page header.
 * initials('Alamgir Khan') -> "AK"
 * @param {string} fullName
 * @param {number} [maxLetters=2]
 * @returns {string}
 */
function initials(fullName, maxLetters = 2) {
    if (!fullName) return '';
    return fullName
        .trim()
        .split(/\s+/)
        .slice(0, maxLetters)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');
}