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

// ---------------------------------------------------------------
// Search — command palette
// ---------------------------------------------------------------

/**
 * A static index of everywhere the user can jump to from search. Pages map to
 * the sidebar destinations; quick actions are common tasks that deep-link into
 * a page (or run a small bit of behavior, like toggling the theme). Keywords
 * widen what each entry matches without cluttering its visible title.
 */
const SEARCH_PAGES = [
    { title: 'Dashboard', sub: 'Overview & stats', icon: 'fa-house', file: 'index', keywords: 'home overview main' },
    { title: 'Profile', sub: 'Your account details', icon: 'fa-user', file: 'profile.html', keywords: 'account me bio' },
    { title: 'Courses', sub: 'Enrolled subjects', icon: 'fa-book-open', file: 'courses.html', keywords: 'subjects classes enroll' },
    { title: 'Assignments', sub: 'Tasks & submissions', icon: 'fa-file-lines', file: 'assignments.html', keywords: 'homework tasks submit due' },
    { title: 'Attendance', sub: 'Presence record', icon: 'fa-calendar-check', file: 'attendance.html', keywords: 'present absent calendar' },
    { title: 'Timetable', sub: 'Weekly schedule', icon: 'fa-clock', file: 'timetables.html', keywords: 'schedule classes routine timetables' },
    { title: 'Results', sub: 'Grades & performance', icon: 'fa-chart-column', file: 'results.html', keywords: 'grades marks gpa scores' },
    { title: 'Fees', sub: 'Payments & installments', icon: 'fa-wallet', file: 'fees.html', keywords: 'payment money installment tuition' },
    { title: 'Notices', sub: 'Announcements', icon: 'fa-bullhorn', file: 'notices.html', keywords: 'announcements news updates' },
    { title: 'Settings', sub: 'Preferences', icon: 'fa-gear', file: 'settings.html', keywords: 'preferences options config account' },
];

const SEARCH_ACTIONS = [
    { title: 'Submit an assignment', sub: 'Go to Assignments', icon: 'fa-cloud-arrow-up', file: 'assignments.html', keywords: 'upload submit hand in homework' },
    { title: 'Pay fees', sub: 'Go to Fees', icon: 'fa-credit-card', file: 'fees.html', keywords: 'pay installment tuition money' },
    { title: "Today's classes", sub: 'Go to Timetable', icon: 'fa-calendar-day', file: 'timetables.html', keywords: 'schedule today classes routine' },
    { title: 'Check my grades', sub: 'Go to Results', icon: 'fa-award', file: 'results.html', keywords: 'grades marks results scores gpa' },
    { title: 'Toggle dark mode', sub: 'Switch theme', icon: 'fa-circle-half-stroke', action: 'theme', keywords: 'dark light theme night mode appearance' },
];

let searchResultsEl;
let searchHintEl;
let searchActiveIndex = -1; // highlighted row for keyboard nav
let searchFlatItems = []; // currently-rendered items, in display order

/**
 * Resolves an index entry's destination to a href correct for the current
 * page depth. 'index' is the dashboard at the site root; everything else
 * lives under /pages/.
 */
function searchHrefFor(entry) {
    if (entry.file === 'index') return indexHref();
    return pagesHref(entry.file);
}

/**
 * Wires the header search into a small command palette: it still dispatches
 * the debounced cq:search event (so page scripts can filter their own data),
 * but now also shows a live, grouped results dropdown, supports keyboard
 * navigation, and can be summoned from anywhere with Cmd/Ctrl+K.
 */
function bindSearch() {
    if (!searchInputEl) return;

    buildSearchUI();

    const dispatchSearch = debounce((query) => {
        document.dispatchEvent(new CustomEvent(SEARCH_EVENT, { detail: { query } }));
    }, 300);

    searchInputEl.addEventListener('input', (event) => {
        const value = event.target.value.trim();
        renderSearchResults(value);
        dispatchSearch(value);
    });

    // Re-open the panel when returning focus to a field that already has text.
    searchInputEl.addEventListener('focus', () => {
        renderSearchResults(searchInputEl.value.trim());
    });

    searchInputEl.addEventListener('keydown', onSearchKeydown);

    // Close on outside click / Escape (Escape also blurs so the cue returns).
    document.addEventListener('click', (event) => {
        const box = searchInputEl.closest('.search-box');
        if (box && !box.contains(event.target)) closeSearchResults();
    });

    // Global shortcut: Cmd+K (mac) / Ctrl+K focuses and opens search.
    document.addEventListener('keydown', (event) => {
        if ((event.metaKey || event.ctrlKey) && (event.key === 'k' || event.key === 'K')) {
            event.preventDefault();
            focusHeaderSearch();
        }
    });
}

/** Injects the ⌘K hint badge and the results container into the search box. */
function buildSearchUI() {
    const box = searchInputEl.closest('.search-box');
    if (!box) return;

    if (!box.querySelector('.search-hint')) {
        searchHintEl = document.createElement('span');
        searchHintEl.className = 'search-hint';
        searchHintEl.setAttribute('aria-hidden', 'true');
        // Show the platform-appropriate modifier so the cue reads right on Mac.
        const isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
        searchHintEl.textContent = isMac ? '⌘K' : 'Ctrl K';
        box.appendChild(searchHintEl);
    }

    searchResultsEl = box.querySelector('.search-results');
    if (!searchResultsEl) {
        searchResultsEl = document.createElement('div');
        searchResultsEl.className = 'search-results';
        searchResultsEl.setAttribute('role', 'listbox');
        box.appendChild(searchResultsEl);
    }

    // ARIA hooks for the combobox relationship.
    searchInputEl.setAttribute('role', 'combobox');
    searchInputEl.setAttribute('aria-expanded', 'false');
    searchInputEl.setAttribute('aria-autocomplete', 'list');
}

/** Case-insensitive match against an entry's title, subtitle, and keywords. */
function searchMatches(entry, q) {
    if (!q) return true;
    const hay = `${entry.title} ${entry.sub || ''} ${entry.keywords || ''}`.toLowerCase();
    return hay.includes(q);
}

/**
 * Filters both groups against the query and (re)paints the dropdown. An empty
 * query shows everything, so the palette doubles as a quick-jump menu.
 */
function renderSearchResults(rawQuery) {
    if (!searchResultsEl) return;
    const box = searchInputEl.closest('.search-box');
    const q = (rawQuery || '').toLowerCase();

    const pages = SEARCH_PAGES.filter((e) => searchMatches(e, q));
    const actions = SEARCH_ACTIONS.filter((e) => searchMatches(e, q));

    searchFlatItems = [];
    searchActiveIndex = -1;

    let html = '';
    if (pages.length) {
        html += '<span class="search-group-label">Pages</span>';
        pages.forEach((e) => { html += searchRowHtml(e, 'page', searchFlatItems.length); searchFlatItems.push(e); });
    }
    if (actions.length) {
        html += '<span class="search-group-label">Quick actions</span>';
        actions.forEach((e) => { html += searchRowHtml(e, 'action', searchFlatItems.length); searchFlatItems.push(e); });
    }
    if (!pages.length && !actions.length) {
        html = `<p class="search-empty">No matches for <strong>${escapeSearchText(rawQuery)}</strong></p>`;
    }

    searchResultsEl.innerHTML = html;
    box.classList.add('results-open');
    searchInputEl.setAttribute('aria-expanded', 'true');

    // Clicking a row activates it (mousedown so it beats the input losing focus).
    searchResultsEl.querySelectorAll('.search-result').forEach((row) => {
        row.addEventListener('mousedown', (event) => {
            event.preventDefault();
            activateSearchItem(Number(row.dataset.index));
        });
    });
}

function searchRowHtml(entry, kind, index) {
    const iconClass = kind === 'action' ? 'search-result-icon action' : 'search-result-icon';
    return `
        <div class="search-result" role="option" data-index="${index}">
            <span class="${iconClass}"><i class="fa-solid ${entry.icon}" aria-hidden="true"></i></span>
            <span class="search-result-body">
                <span class="search-result-title">${escapeSearchText(entry.title)}</span>
                <span class="search-result-sub">${escapeSearchText(entry.sub || '')}</span>
            </span>
            <i class="fa-solid fa-arrow-turn-down search-result-go" aria-hidden="true"></i>
        </div>`;
}

/** Minimal HTML-escape so query text / titles can't inject markup. */
function escapeSearchText(str) {
    return String(str).replace(/[&<>"']/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
}

function closeSearchResults() {
    const box = searchInputEl?.closest('.search-box');
    if (box) box.classList.remove('results-open');
    searchInputEl?.setAttribute('aria-expanded', 'false');
    searchActiveIndex = -1;
}

/** Focuses the header search, opening the panel; also reveals it on mobile. */
function focusHeaderSearch() {
    const headerEl = qs('.header');
    const collapsed = headerEl && !headerEl.classList.contains('search-open');

    const doFocus = () => {
        searchInputEl.focus();
        searchInputEl.select();
        renderSearchResults(searchInputEl.value.trim());
    };

    if (collapsed) {
        // On narrow screens the field is collapsed and transitions in from
        // visibility:hidden — it isn't focusable until that flips, so reveal
        // it first and defer the focus (matches the mobile toggle's timing).
        headerEl.classList.add('search-open');
        setTimeout(doFocus, 60);
    } else {
        doFocus();
    }
}

function setActiveSearchRow(index) {
    const rows = searchResultsEl.querySelectorAll('.search-result');
    rows.forEach((r) => r.classList.remove('is-active'));
    if (index >= 0 && rows[index]) {
        rows[index].classList.add('is-active');
        rows[index].scrollIntoView({ block: 'nearest' });
    }
    searchActiveIndex = index;
}

function onSearchKeydown(event) {
    const box = searchInputEl.closest('.search-box');
    const open = box && box.classList.contains('results-open');

    switch (event.key) {
        case 'ArrowDown':
            if (!open) { renderSearchResults(searchInputEl.value.trim()); return; }
            event.preventDefault();
            setActiveSearchRow(Math.min(searchActiveIndex + 1, searchFlatItems.length - 1));
            break;
        case 'ArrowUp':
            if (!open) return;
            event.preventDefault();
            setActiveSearchRow(Math.max(searchActiveIndex - 1, 0));
            break;
        case 'Enter':
            if (open && searchActiveIndex >= 0) {
                event.preventDefault();
                activateSearchItem(searchActiveIndex);
            }
            break;
        case 'Escape':
            if (open) {
                event.preventDefault();
                closeSearchResults();
                searchInputEl.blur();
            }
            break;
    }
}

/** Runs a result: navigates for pages/link-actions, or handles inline actions. */
function activateSearchItem(index) {
    const entry = searchFlatItems[index];
    if (!entry) return;

    if (entry.action === 'theme') {
        themeToggleEl?.click();
        closeSearchResults();
        searchInputEl.blur();
        return;
    }

    const href = searchHrefFor(entry);
    if (href) window.location.href = href;
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