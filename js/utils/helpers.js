/**
 * utils/helpers.js
 * General-purpose utilities that don't belong in constants.js (data),
 * storage.js (localStorage), formatter.js (display formatting), or
 * validators.js (form validation). Mostly: timing control, DOM
 * shortcuts, and small data-shaping helpers used across components/pages.
 */
// ---------------------------------------------------------------
// Timing control
// ---------------------------------------------------------------

/**
 * Delay calling `fn` until `wait` ms have passed with no further calls —
 * e.g. the header search input shouldn't re-filter on every keystroke.
 * @param {Function} fn
 * @param {number} wait
 * @returns {Function}
 */
function debounce(fn, wait = 300) {
    let timeoutId;
    return function debounced(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), wait);
    };
}

/**
 * Ensure `fn` runs at most once per `wait` ms — e.g. a scroll or resize
 * listener that toggles sidebar-collapsed state shouldn't fire hundreds
 * of times a second.
 * @param {Function} fn
 * @param {number} wait
 * @returns {Function}
 */
function throttle(fn, wait = 200) {
    let isWaiting = false;
    let pendingArgs = null;

    return function throttled(...args) {
        if (isWaiting) {
            pendingArgs = args;
            return;
        }
        fn.apply(this, args);
        isWaiting = true;
        setTimeout(() => {
            isWaiting = false;
            if (pendingArgs) {
                throttled.apply(this, pendingArgs);
                pendingArgs = null;
            }
        }, wait);
    };
}

/**
 * Promise-based delay, mainly for mocking API latency during development
 * before a real backend exists (see config.js's empty API.baseUrl).
 * await sleep(500);
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------
// DOM shortcuts
// ---------------------------------------------------------------

/**
 * Shorthand for querySelector, optionally scoped to a parent element.
 * @param {string} selector
 * @param {ParentNode} [scope=document]
 * @returns {Element|null}
 */
function qs(selector, scope = document) {
    return scope.querySelector(selector);
}

/**
 * Shorthand for querySelectorAll that returns a real array (so you can
 * .map()/.filter() directly instead of spreading a NodeList every time).
 * @param {string} selector
 * @param {ParentNode} [scope=document]
 * @returns {Element[]}
 */
function qsa(selector, scope = document) {
    return Array.from(scope.querySelectorAll(selector));
}

/**
 * Attach one listener to a parent and react only to events whose target
 * matches `selector` — avoids re-binding listeners every time a list
 * (e.g. notices, assignments) re-renders its items.
 * @param {Element} parent
 * @param {string} eventType
 * @param {string} selector
 * @param {(event: Event, matchedEl: Element) => void} handler
 */
function delegate(parent, eventType, selector, handler) {
    parent.addEventListener(eventType, (event) => {
        const matchedEl = event.target.closest(selector);
        if (matchedEl && parent.contains(matchedEl)) {
            handler(event, matchedEl);
        }
    });
}

/**
 * Build a className string from a mix of strings and conditionally-included
 * values, skipping falsy entries — a tiny stand-in for the "classnames"
 * npm package without adding a dependency.
 * classNames('status', isPaid && 'paid', isPending && 'pending')
 *   -> "status paid" (if isPaid is true)
 * @param {...(string|false|null|undefined)} args
 * @returns {string}
 */
function classNames(...args) {
    return args.filter(Boolean).join(' ');
}

// ---------------------------------------------------------------
// Responsive helpers — kept in sync with CONFIG.BREAKPOINTS, which is
// itself kept in sync with responsive/*.css
// ---------------------------------------------------------------

/**
 * @returns {boolean} true if viewport is at or below the tablet breakpoint
 */
function isTabletOrBelow() {
    return window.innerWidth <= CONFIG.BREAKPOINTS.tablet;
}

/**
 * @returns {boolean} true if viewport is at or below the small-device breakpoint
 */
function isSmallDeviceOrBelow() {
    return window.innerWidth <= CONFIG.BREAKPOINTS.smallDevice;
}

/**
 * @returns {boolean} true if viewport is at or below the mobile breakpoint
 */
function isMobile() {
    return window.innerWidth <= CONFIG.BREAKPOINTS.mobile;
}

/**
 * Run `callback` immediately and again every time the given breakpoint is
 * crossed (not on every resize event) — e.g. auto-collapsing the sidebar
 * exactly once when crossing into tablet width, not repeatedly while dragging.
 * @param {number} breakpoint - a pixel width, typically from CONFIG.BREAKPOINTS
 * @param {(matches: boolean) => void} callback
 */
function onBreakpointCross(breakpoint, callback) {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
    callback(mql.matches);
    mql.addEventListener('change', (event) => callback(event.matches));
}

// ---------------------------------------------------------------
// Data shaping
// ---------------------------------------------------------------

/**
 * Group an array of objects by the value of `key`.
 * groupBy(assignments, 'status') -> { pending: [...], submitted: [...] }
 * @param {Array<Object>} arr
 * @param {string} key
 * @returns {Object<string, Array<Object>>}
 */
function groupBy(arr, key) {
    return arr.reduce((groups, item) => {
        const groupKey = item[key];
        (groups[groupKey] ??= []).push(item);
        return groups;
    }, {});
}

/**
 * Sum the numeric value of `key` across an array of objects.
 * sumBy(feeItems, 'amount') -> 4800
 * @param {Array<Object>} arr
 * @param {string} key
 * @returns {number}
 */
function sumBy(arr, key) {
    return arr.reduce((total, item) => total + (Number(item[key]) || 0), 0);
}

/**
 * Constrain a number between min and max.
 * clamp(120, 0, 100) -> 100
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * Deep-clone plain JSON-safe data (objects/arrays/primitives — not
 * functions, Dates, or class instances). Fine for cloning API responses
 * or config-derived state before mutating it locally.
 * @param {*} value
 * @returns {*}
 */
function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
}

/**
 * Generate a short, non-cryptographic unique ID — fine for client-side
 * list keys (e.g. a locally-added notice) before a real backend assigns
 * a permanent ID.
 * @returns {string}
 */
function generateId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}