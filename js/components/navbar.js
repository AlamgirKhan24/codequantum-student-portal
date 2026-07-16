/**
 * components/navbar.js
 * Behavior for the <header class="header"> present on every page:
 *   - search input (debounced input event, no filtering logic itself —
 *     just dispatches a custom event pages can listen for)
 *   - notification bell button + badge count
 *   - dark/light theme toggle, persisted via utils/storage.js
 *   - profile dropdown open/close
 *
 * Markup this expects (already present on every page):
 *   .search-box input[type="search"]
 *   .icon-button[aria-label="Notifications"] with a .notification-badge span
 *   #themeToggle button
 *   .profile (click target that should reveal a dropdown — dropdown markup
 *   itself isn't in the HTML yet, see note below)
 */
const THEME_ATTR = CONFIG.THEME.attribute; // 'data-theme'
const SEARCH_EVENT = 'cq:search'; // custom event pages can listen for
const PROFILE_OPEN_CLASS = 'profile-open';

let themeToggleEl;
let searchInputEl;
let notificationsBtnEl;
let profileEl;

/**
 * Initialize navbar behavior. Call once per page after DOMContentLoaded.
 */
function initNavbar() {
    themeToggleEl = qs('#themeToggle');
    searchInputEl = qs('.search-box input[type="search"]');
    notificationsBtnEl = qs('.icon-button[aria-label="Notifications"]');
    profileEl = qs('.profile');

    applyStoredTheme();
    bindThemeToggle();
    bindSearch();
    bindNotifications();
    bindProfileDropdown();
}

// ---------------------------------------------------------------
// Theme toggle
// ---------------------------------------------------------------

function applyStoredTheme() {
    const theme = getTheme();
    document.documentElement.setAttribute(THEME_ATTR, theme);
    updateThemeIcon(theme);
}

function bindThemeToggle() {
    if (!themeToggleEl) {
        console.warn('[navbar] #themeToggle button not found on this page.');
        return;
    }

    themeToggleEl.addEventListener('click', () => {
        const current = document.documentElement.getAttribute(THEME_ATTR) || CONFIG.THEME.default;
        const next = current === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute(THEME_ATTR, next);
        setTheme(next);
        updateThemeIcon(next);
    });
}

/**
 * Swaps the moon/sun icon to match current theme. Assumes Font Awesome
 * classes already used elsewhere in the project (fa-regular fa-moon /
 * fa-regular fa-sun) rather than introducing a new icon set.
 * @param {string} theme
 */
function updateThemeIcon(theme) {
    if (!themeToggleEl) return;
    const icon = themeToggleEl.querySelector('i');
    if (!icon) return;

    icon.classList.remove('fa-moon', 'fa-sun');
    icon.classList.add(theme === 'dark' ? 'fa-sun' : 'fa-moon');
}

// ---------------------------------------------------------------
// Search
// ---------------------------------------------------------------

/**
 * Dispatches a debounced custom event on input rather than filtering
 * anything here directly — navbar.js shouldn't need to know what a
 * "course" or "assignment" is. Individual page scripts (assignments.js,
 * courses.js, etc.) listen for this and filter their own data:
 *
 *   document.addEventListener('cq:search', (e) => { ... e.detail.query ... });
 */
function bindSearch() {
    if (!searchInputEl) return;

    const dispatchSearch = debounce((query) => {
        document.dispatchEvent(new CustomEvent(SEARCH_EVENT, { detail: { query } }));
    }, 300);

    searchInputEl.addEventListener('input', (event) => {
        dispatchSearch(event.target.value.trim());
    });
}

// ---------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------

/**
 * Updates the badge count shown on the bell icon, capping the display
 * at CONFIG.NOTIFICATIONS.maxBadgeCount (e.g. "9+").
 * @param {number} count
 */
function setNotificationBadge(count) {
    const badgeEl = notificationsBtnEl?.querySelector('.notification-badge');
    if (!badgeEl) return;

    const max = CONFIG.NOTIFICATIONS.maxBadgeCount;
    badgeEl.textContent = count > max ? `${max}+` : String(count);
    badgeEl.style.display = count > 0 ? '' : 'none';
}

function bindNotifications() {
    if (!notificationsBtnEl) return;

    // Placeholder click behavior until a real notifications panel/dropdown
    // is designed — dispatches an event other code (or a future
    // components/notifications-panel.js) can hook into.
    notificationsBtnEl.addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('cq:notifications-toggle'));
    });
}

// ---------------------------------------------------------------
// Profile dropdown
// ---------------------------------------------------------------

/**
 * NOTE: the current header HTML only has the clickable .profile block
 * (avatar + name + chevron) — there's no dropdown menu markup yet. This
 * just toggles a class for now; the actual dropdown panel (Logout link,
 * "View Profile", etc.) needs adding to each page's HTML once the design
 * is ready, then this function's job is already done.
 */
function bindProfileDropdown() {
    if (!profileEl) return;

    profileEl.addEventListener('click', (event) => {
        event.stopPropagation();
        profileEl.classList.toggle(PROFILE_OPEN_CLASS);
    });

    document.addEventListener('click', (event) => {
        if (profileEl.classList.contains(PROFILE_OPEN_CLASS) && !profileEl.contains(event.target)) {
            profileEl.classList.remove(PROFILE_OPEN_CLASS);
        }
    });
}