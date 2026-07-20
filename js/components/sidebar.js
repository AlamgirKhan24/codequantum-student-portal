/**
 * components/sidebar.js
 * Behavior for the <aside class="sidebar"> present on every page:
 *   - toggling collapsed/expanded state via the header's #menuToggle button
 *   - persisting that state across page loads (utils/storage.js)
 *   - auto-collapsing below the tablet breakpoint, and treating the sidebar
 *     as an overlay (not a squeeze) on small screens
 *   - highlighting the active nav link based on the current page URL,
 *     driven by constants.js's NAV_ITEMS instead of relying solely on
 *     hand-added `class="active" aria-current="page"` per HTML file
 *
 * Markup this expects (already present on every page):
 *   <aside class="sidebar"> ... <nav class="navigation"><ul><li><a href="...">
 *   <button id="menuToggle"> in the header
 */

const COLLAPSED_CLASS = 'sidebar-collapsed'; // applied to .app (desktop collapse)
const OVERLAY_OPEN_CLASS = 'sidebar-open'; // applied to .app (mobile slide-in overlay)

let sidebarEl;
let menuToggleEl;
let appEl;
let backdropEl;

/**
 * Initialize sidebar behavior. Call once per page after DOMContentLoaded.
 */
function initSidebar() {
    sidebarEl = qs('.sidebar');
    menuToggleEl = qs('#menuToggle');
    appEl = qs('.app') || document.body;

    if (!sidebarEl) {
        console.warn('[sidebar] .sidebar element not found on this page.');
        return;
    }

    createBackdrop();
    highlightActiveLink();
    restoreCollapsedState();
    bindMenuToggle();
    bindNavLinkClose();
    bindOutsideClickToClose();
    watchResponsiveBreakpoint();
}

/**
 * Dim backdrop shown behind the slide-in sidebar on mobile. Clicking it
 * closes the overlay. Created once and reused; visibility is driven by the
 * .sidebar-open class in CSS.
 */
function createBackdrop() {
    backdropEl = qs('.sidebar-backdrop');
    if (!backdropEl) {
        backdropEl = document.createElement('div');
        backdropEl.className = 'sidebar-backdrop';
        appEl.appendChild(backdropEl);
    }
    backdropEl.addEventListener('click', closeMobileOverlay);
}

// ---------------------------------------------------------------
// Active link highlighting
// ---------------------------------------------------------------

/**
 * Marks the nav item matching the current page as active, using
 * NAV_ITEMS as the source of truth rather than relying on each HTML
 * file remembering to hardcode class="active" aria-current="page" —
 * this is exactly the kind of drift that caused the earlier
 * timetable.html/timetables.html link inconsistency across pages.
 */
function highlightActiveLink() {
    // Normalize to a bare page name without the .html extension, since the
    // dev/prod server may serve "/pages/assignments" or "/pages/assignments.html"
    // — comparing the raw pathname to the href would miss when the extension
    // is stripped, leaving no nav item highlighted.
    const normalize = (path) => {
        const file = (path || '').split('/').pop().split('?')[0].split('#')[0];
        if (!file) return 'index';
        return file.replace(/\.html$/, '');
    };

    const currentPage = normalize(window.location.pathname);

    qsa('a', sidebarEl).forEach((link) => {
        const linkPage = normalize(link.getAttribute('href'));
        const isActive = linkPage === currentPage;

        link.classList.toggle('active', isActive);
        if (isActive) {
            link.setAttribute('aria-current', 'page');
        } else {
            link.removeAttribute('aria-current');
        }
    });
}

// ---------------------------------------------------------------
// Collapse / expand
// ---------------------------------------------------------------

function restoreCollapsedState() {
    const collapsed = isSidebarCollapsed();
    appEl.classList.toggle(COLLAPSED_CLASS, collapsed);
}

function bindMenuToggle() {
    if (!menuToggleEl) {
        console.warn('[sidebar] #menuToggle button not found on this page.');
        return;
    }

    menuToggleEl.addEventListener('click', () => {
        if (window.innerWidth <= CONFIG.BREAKPOINTS.tablet) {
            // Small screens: sidebar behaves as a slide-in overlay, not a
            // permanent collapse — state isn't persisted, since it should
            // reopen closed on the next page load.
            const open = appEl.classList.toggle(OVERLAY_OPEN_CLASS);
            menuToggleEl.setAttribute('aria-expanded', String(open));
        } else {
            const collapsed = !appEl.classList.contains(COLLAPSED_CLASS);
            appEl.classList.toggle(COLLAPSED_CLASS, collapsed);
            menuToggleEl.setAttribute('aria-expanded', String(!collapsed));
            setSidebarCollapsed(collapsed);
        }
    });
}

/**
 * On mobile, tapping a nav link should navigate AND close the overlay so
 * the destination page isn't hidden behind an open sidebar.
 */
function bindNavLinkClose() {
    qsa('.navigation a', sidebarEl).forEach((link) => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= CONFIG.BREAKPOINTS.tablet) {
                closeMobileOverlay();
            }
        });
    });
}

/**
 * On mobile, clicking anywhere outside the open sidebar overlay closes it —
 * standard slide-in-menu behavior users already expect.
 */
function bindOutsideClickToClose() {
    document.addEventListener('click', (event) => {
        const isMobileOverlayOpen = appEl.classList.contains(OVERLAY_OPEN_CLASS);
        if (!isMobileOverlayOpen) return;

        const clickedInsideSidebar = sidebarEl.contains(event.target);
        const clickedToggleButton = menuToggleEl?.contains(event.target);

        if (!clickedInsideSidebar && !clickedToggleButton) {
            closeMobileOverlay();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && appEl.classList.contains(OVERLAY_OPEN_CLASS)) {
            closeMobileOverlay();
        }
    });
}

/**
 * Auto-collapse when crossing into tablet width, auto-expand back out —
 * and always close the mobile overlay state when growing back past mobile
 * width, so resizing a window back up doesn't leave a stale overlay open.
 */
function watchResponsiveBreakpoint() {
    onBreakpointCross(CONFIG.BREAKPOINTS.tablet, (isBelowTablet) => {
        if (isBelowTablet) {
            appEl.classList.remove(COLLAPSED_CLASS);
        } else {
            appEl.classList.remove(OVERLAY_OPEN_CLASS);
            appEl.classList.toggle(COLLAPSED_CLASS, isSidebarCollapsed());
        }
    });
}

/**
 * Exposed for other components (e.g. a page that needs to force-close
 * the sidebar overlay after navigating via a link inside it).
 */
function closeMobileOverlay() {
    appEl.classList.remove(OVERLAY_OPEN_CLASS);
    menuToggleEl?.setAttribute('aria-expanded', 'false');
}