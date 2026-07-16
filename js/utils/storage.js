/**
 * utils/storage.js
 * Thin wrapper around localStorage. Every read/write in the app should go
 * through this module rather than calling localStorage directly — this is
 * the ONLY file that should know localStorage exists. That gives us:
 *   - automatic JSON serialization/deserialization
 *   - a single try/catch boundary (private browsing, quota exceeded,
 *     disabled storage, etc. all fail safely instead of throwing app-wide)
 *   - one place to swap the backing store later (e.g. sessionStorage,
 *     IndexedDB, or a real API) without touching every page file
 */

const PREFIX_CHECKED_KEYS = new Set(Object.values(CONFIG.STORAGE_KEYS));

/**
 * Warn (once, in dev) if a caller uses a raw string key that isn't
 * registered in CONFIG.STORAGE_KEYS — catches typos and key collisions
 * before they become a "why did my theme reset" bug.
 */
function assertKnownKey(key) {
    if (!PREFIX_CHECKED_KEYS.has(key)) {
        console.warn(
            `[storage] "${key}" isn't listed in CONFIG.STORAGE_KEYS. ` +
            `Add it there so keys stay centralized and typo-proof.`
        );
    }
}

/**
 * Read a value from localStorage.
 * @param {string} key - should be one of CONFIG.STORAGE_KEYS values
 * @param {*} fallback - returned if the key is missing or unreadable
 * @returns {*}
 */
function getItem(key, fallback = null) {
    assertKnownKey(key);
    try {
        const raw = localStorage.getItem(key);
        if (raw === null) return fallback;
        return JSON.parse(raw);
    } catch (err) {
        console.error(`[storage] Failed to read "${key}":`, err);
        return fallback;
    }
}

/**
 * Write a value to localStorage. Value is JSON-stringified, so objects,
 * arrays, booleans, and numbers all round-trip correctly (unlike raw
 * localStorage, which silently stringifies everything to text).
 * @param {string} key
 * @param {*} value
 * @returns {boolean} whether the write succeeded
 */
function setItem(key, value) {
    assertKnownKey(key);
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (err) {
        // Most commonly QuotaExceededError, or storage disabled entirely
        // (some private-browsing modes). Fail quietly — callers can check
        // the return value if they need to react (e.g. show a warning).
        console.error(`[storage] Failed to write "${key}":`, err);
        return false;
    }
}

/**
 * Remove a single key.
 * @param {string} key
 */
function removeItem(key) {
    assertKnownKey(key);
    try {
        localStorage.removeItem(key);
    } catch (err) {
        console.error(`[storage] Failed to remove "${key}":`, err);
    }
}

/**
 * Remove every key this app owns (all values in CONFIG.STORAGE_KEYS).
 * Useful for a "log out" or "reset app data" action — deliberately does
 * NOT call localStorage.clear(), so it never touches unrelated data if
 * this app ever shares an origin with something else.
 */
function clearAppStorage() {
    Object.values(CONFIG.STORAGE_KEYS).forEach((key) => removeItem(key));
}

/**
 * Whether localStorage is actually usable in this browser context
 * (some private-browsing modes and locked-down environments disable it).
 * Call this once at app startup if you want to show a fallback/warning
 * banner instead of silently failing every write.
 * @returns {boolean}
 */
function isStorageAvailable() {
    const testKey = '__cq_storage_test__';
    try {
        localStorage.setItem(testKey, '1');
        localStorage.removeItem(testKey);
        return true;
    } catch {
        return false;
    }
}

// ---------------------------------------------------------------
// Convenience helpers for the most commonly read/written keys, so page
// scripts can call e.g. getTheme()/setTheme('dark') instead of remembering
// the exact CONFIG.STORAGE_KEYS.theme string each time.
// ---------------------------------------------------------------

function getTheme() {
    return getItem(CONFIG.STORAGE_KEYS.theme, CONFIG.THEME.default);
}

function setTheme(theme) {
    return setItem(CONFIG.STORAGE_KEYS.theme, theme);
}

function isSidebarCollapsed() {
    return getItem(CONFIG.STORAGE_KEYS.sidebarCollapsed, false);
}

function setSidebarCollapsed(collapsed) {
    return setItem(CONFIG.STORAGE_KEYS.sidebarCollapsed, collapsed);
}

function getUserProfile() {
    return getItem(CONFIG.STORAGE_KEYS.userProfile, null);
}

function setUserProfile(profile) {
    return setItem(CONFIG.STORAGE_KEYS.userProfile, profile);
}