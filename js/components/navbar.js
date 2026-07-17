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
    bindMobileSearchToggle();
    bindHeaderScrollState();
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

/**
 * On narrow screens the full search field is hidden and replaced by a round
 * search icon. Clicking it slides the field down as a panel and focuses it;
 * clicking the icon again, pressing Escape, or clicking outside closes it.
 * The button is injected here so all pages get it without editing markup.
 */
function bindMobileSearchToggle() {
    const searchBox = qs('.search-box');
    const headerEl = qs('.header');
    if (!searchBox || !headerEl) return;

    // Build the trigger once and place it just before the search field.
    let toggleBtn = qs('.search-toggle');
    if (!toggleBtn) {
        toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'search-toggle';
        toggleBtn.setAttribute('aria-label', 'Search');
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.innerHTML = '<i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>';
        searchBox.parentElement.insertBefore(toggleBtn, searchBox);
    }

    const openSearch = () => {
        headerEl.classList.add('search-open');
        toggleBtn.setAttribute('aria-expanded', 'true');
        // Focus the field once it's visible so typing starts immediately.
        setTimeout(() => searchInputEl?.focus(), 50);
    };

    const closeSearch = () => {
        headerEl.classList.remove('search-open');
        toggleBtn.setAttribute('aria-expanded', 'false');
    };

    toggleBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        if (headerEl.classList.contains('search-open')) {
            closeSearch();
        } else {
            openSearch();
        }
    });

    // Outside click / Escape close, but only while the panel is open.
    document.addEventListener('click', (event) => {
        if (!headerEl.classList.contains('search-open')) return;
        if (searchBox.contains(event.target) || toggleBtn.contains(event.target)) return;
        closeSearch();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && headerEl.classList.contains('search-open')) {
            closeSearch();
        }
    });
}

/**
 * Adds a subtle shadow/opacity shift to the header once the page has
 * scrolled, so it reads as a floating layer rather than a flat strip.
 */
function bindHeaderScrollState() {
    const headerEl = qs('.header');
    const scrollHost = qs('.main-content') || window;
    if (!headerEl) return;

    const getScroll = () => (scrollHost === window ? window.scrollY : scrollHost.scrollTop);
    const update = () => headerEl.classList.toggle('scrolled', getScroll() > 4);

    update();
    scrollHost.addEventListener('scroll', update, { passive: true });
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

// Recent notices shown in the header panel. Kept small and static here;
// the full feed lives on the Notices page. Links resolve for both the
// dashboard (root) and sub-pages via noticesHref().
const RECENT_NOTICES = [
    { icon: 'fa-graduation-cap', tone: 'academic', title: 'Midterm exam schedule published', time: 'Jul 15' },
    { icon: 'fa-calendar-day', tone: 'events', title: 'CodeQuantum Hackathon — registrations open', time: 'Jul 14' },
    { icon: 'fa-wallet', tone: 'fees', title: 'Installment 3 due Aug 15', time: 'Jul 12' },
];

function noticesHref() {
    // Sub-pages live in /pages/; the dashboard is at the root.
    return window.location.pathname.includes('/pages/') ? 'notices.html' : './pages/notices.html';
}

function bindNotifications() {
    if (!notificationsBtnEl) return;

    const panel = buildNotificationsPanel();
    notificationsBtnEl.setAttribute('aria-haspopup', 'true');
    notificationsBtnEl.setAttribute('aria-expanded', 'false');

    notificationsBtnEl.addEventListener('click', (event) => {
        event.stopPropagation();
        const open = panel.classList.toggle('open');
        notificationsBtnEl.setAttribute('aria-expanded', String(open));
        if (open && profileEl) profileEl.classList.remove(PROFILE_OPEN_CLASS);
        document.dispatchEvent(new CustomEvent('cq:notifications-toggle', { detail: { open } }));
    });

    document.addEventListener('click', (event) => {
        if (panel.classList.contains('open') && !panel.contains(event.target) && !notificationsBtnEl.contains(event.target)) {
            panel.classList.remove('open');
            notificationsBtnEl.setAttribute('aria-expanded', 'false');
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && panel.classList.contains('open')) {
            panel.classList.remove('open');
            notificationsBtnEl.setAttribute('aria-expanded', 'false');
        }
    });
}

function buildNotificationsPanel() {
    const existing = qs('.notifications-panel');
    if (existing) return existing;

    const panel = document.createElement('div');
    panel.className = 'notifications-panel';
    panel.setAttribute('role', 'menu');

    const items = RECENT_NOTICES.map((n) => `
        <a class="notif-item" href="${noticesHref()}" role="menuitem">
            <span class="notif-item-icon ${n.tone}"><i class="fa-solid ${n.icon}"></i></span>
            <span class="notif-item-body">
                <span class="notif-item-title">${n.title}</span>
                <span class="notif-item-time">${n.time}</span>
            </span>
        </a>`).join('');

    panel.innerHTML = `
        <div class="notif-head">
            <h4>Notifications</h4>
            <span class="notif-count">${RECENT_NOTICES.length} new</span>
        </div>
        <div class="notif-list">${items}</div>
        <a class="notif-footer" href="${noticesHref()}">View all notices</a>`;

    // Anchor the panel to the bell's positioned parent (.header-right).
    const anchor = notificationsBtnEl.parentElement || document.body;
    if (getComputedStyle(anchor).position === 'static') {
        anchor.style.position = 'relative';
    }
    anchor.appendChild(panel);
    return panel;
}

// ---------------------------------------------------------------
// Profile dropdown
// ---------------------------------------------------------------

/**
 * Injects the dropdown menu markup into the existing .profile block and
 * wires open/close + logout. The menu isn't in the page HTML — it's built
 * here so all 10 pages stay in sync from one place.
 */
function bindProfileDropdown() {
    if (!profileEl) return;

    buildProfileMenu();
    profileEl.setAttribute('role', 'button');
    profileEl.setAttribute('tabindex', '0');
    profileEl.setAttribute('aria-haspopup', 'true');
    profileEl.setAttribute('aria-expanded', 'false');

    const toggle = () => {
        const open = profileEl.classList.toggle(PROFILE_OPEN_CLASS);
        profileEl.setAttribute('aria-expanded', String(open));
    };

    profileEl.addEventListener('click', (event) => {
        if (event.target.closest('.profile-menu')) return; // let menu links work
        event.stopPropagation();
        toggle();
    });

    profileEl.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            if (event.target.closest('.profile-menu')) return;
            event.preventDefault();
            toggle();
        }
    });

    document.addEventListener('click', (event) => {
        if (profileEl.classList.contains(PROFILE_OPEN_CLASS) && !profileEl.contains(event.target)) {
            profileEl.classList.remove(PROFILE_OPEN_CLASS);
            profileEl.setAttribute('aria-expanded', 'false');
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && profileEl.classList.contains(PROFILE_OPEN_CLASS)) {
            profileEl.classList.remove(PROFILE_OPEN_CLASS);
            profileEl.setAttribute('aria-expanded', 'false');
        }
    });
}

function pagesHref(file) {
    return window.location.pathname.includes('/pages/') ? file : `./pages/${file}`;
}

function indexHref() {
    return window.location.pathname.includes('/pages/') ? '../index.html' : './index.html';
}

function buildProfileMenu() {
    if (profileEl.querySelector('.profile-menu')) return;

    const profile = getUserProfile() || {};
    const name = profile.name || 'Alex Johnson';
    const email = profile.email || 'alex.johnson@codequantum.edu';

    const menu = document.createElement('div');
    menu.className = 'profile-menu';
    menu.setAttribute('role', 'menu');
    menu.innerHTML = `
        <div class="profile-menu-head">
            <span class="profile-menu-name"></span>
            <span class="profile-menu-email"></span>
        </div>
        <a class="profile-menu-item" role="menuitem" href="${pagesHref('profile.html')}">
            <i class="fa-solid fa-user" aria-hidden="true"></i> View profile
        </a>
        <a class="profile-menu-item" role="menuitem" href="${pagesHref('settings.html')}">
            <i class="fa-solid fa-gear" aria-hidden="true"></i> Settings
        </a>
        <button type="button" class="profile-menu-item profile-menu-logout" role="menuitem">
            <i class="fa-solid fa-arrow-right-from-bracket" aria-hidden="true"></i> Log out
        </button>`;
    menu.querySelector('.profile-menu-name').textContent = name;
    menu.querySelector('.profile-menu-email').textContent = email;

    menu.querySelector('.profile-menu-logout').addEventListener('click', (event) => {
        event.stopPropagation();
        logout();
    });

    profileEl.appendChild(menu);
}

function logout() {
    try {
        clearAppStorage();
    } catch (err) {
        console.warn('[navbar] clearAppStorage failed:', err);
    }
    if (typeof showToast === 'function') {
        showToast('Signed out. Redirecting…', 'info', { duration: 1200 });
    }
    setTimeout(() => {
        window.location.href = indexHref();
    }, 700);
}