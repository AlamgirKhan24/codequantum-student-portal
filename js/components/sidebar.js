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

import CONFIG from '../config/config.js';
import { NAV_ITEMS } from '../utils/constants.js';
import { isSidebarCollapsed, setSidebarCollapsed } from '../utils/storage.js';
import { qs, qsa, onBreakpointCross, classNames } from '../utils/helpers.js';

const COLLAPSED_CLASS = 'sidebar-collapsed'; // applied to <body>
const OVERLAY_OPEN_CLASS = 'sidebar-open'; // applied to <body>, mobile-only overlay state

let sidebarEl;
let menuToggleEl;

/**
 * Initialize sidebar behavior. Call once per page after DOMContentLoaded.
 */
export function initSidebar() {
    sidebarEl = qs('.sidebar');
    menuToggleEl = qs('#menuToggle');

    if (!sidebarEl) {
        console.warn('[sidebar] .sidebar element not found on this page.');
        return;
    }

    highlightActiveLink();
    restoreCollapsedState();
    bindMenuToggle();
    bindOutsideClickToClose();
    watchResponsiveBreakpoint();
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
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';

    qsa('a', sidebarEl).forEach((link) => {
        const linkPath = link.getAttribute('href') ? .split('/').pop();
        const isActive = linkPath === currentPath;

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
    document.body.classList.toggle(COLLAPSED_CLASS, collapsed);
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
            document.body.classList.toggle(OVERLAY_OPEN_CLASS);
        } else {
            const collapsed = !document.body.classList.contains(COLLAPSED_CLASS);
            document.body.classList.toggle(COLLAPSED_CLASS, collapsed);
            setSidebarCollapsed(collapsed);
        }
    });
}

/**
 * On mobile, clicking anywhere outside the open sidebar overlay closes it —
 * standard slide-in-menu behavior users already expect.
 */
function bindOutsideClickToClose() {
    document.addEventListener('click', (event) => {
        const isMobileOverlayOpen = document.body.classList.contains(OVERLAY_OPEN_CLASS);
        if (!isMobileOverlayOpen) return;

        const clickedInsideSidebar = sidebarEl.contains(event.target);
        const clickedToggleButton = menuToggleEl ? .contains(event.target);

        if (!clickedInsideSidebar && !clickedToggleButton) {
            document.body.classList.remove(OVERLAY_OPEN_CLASS);
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
            document.body.classList.add(COLLAPSED_CLASS);
        } else {
            document.body.classList.remove(OVERLAY_OPEN_CLASS);
            document.body.classList.toggle(COLLAPSED_CLASS, isSidebarCollapsed());
        }
    });
}

/**
 * Exposed for other components (e.g. a page that needs to force-close
 * the sidebar overlay after navigating via a link inside it).
 */
export function closeMobileOverlay() {
    document.body.classList.remove(OVERLAY_OPEN_CLASS);
}