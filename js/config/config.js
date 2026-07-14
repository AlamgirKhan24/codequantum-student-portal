/**
 * config.js
 * Centralized configuration for the CodeQuantum Student Portal.
 * Every other JS module (components, utils, pages) should read settings
 * from here instead of hardcoding values, so there's a single source of
 * truth for storage keys, breakpoints, and app-wide constants.
 */

const CONFIG = {

    // ---------------------------------------------------------------
    // App metadata
    // ---------------------------------------------------------------
    APP: {
        name: 'CodeQuantum',
        fullName: 'CodeQuantum Student Portal',
        version: '1.0.0',
    },

    // ---------------------------------------------------------------
    // Responsive breakpoints — must stay in sync with responsive/*.css
    // (tablet.css / smalldevice.css / mobile.css use the same values)
    // ---------------------------------------------------------------
    BREAKPOINTS: {
        tablet: 1024,
        smallDevice: 768,
        mobile: 480,
    },

    // ---------------------------------------------------------------
    // localStorage keys — kept in one place so utils/storage.js and any
    // page script never risk typo'ing a key or colliding with another
    // feature's stored value.
    // ---------------------------------------------------------------
    STORAGE_KEYS: {
        theme: 'cq_theme', // 'light' | 'dark'
        sidebarCollapsed: 'cq_sidebar_collapsed',
        authToken: 'cq_auth_token',
        userProfile: 'cq_user_profile',
        notificationsSeen: 'cq_notifications_seen',
    },

    // ---------------------------------------------------------------
    // Theme
    // ---------------------------------------------------------------
    THEME: {
        default: 'light',
        options: ['light', 'dark'],
        attribute: 'data-theme', // applied to <html> or <body>
    },

    // ---------------------------------------------------------------
    // Sidebar
    // ---------------------------------------------------------------
    SIDEBAR: {
        collapsedByDefaultBelow: 1024, // auto-collapse under tablet breakpoint
        animationDuration: 300, // ms — should match CSS transition timing
    },

    // ---------------------------------------------------------------
    // Notifications (header bell icon)
    // ---------------------------------------------------------------
    NOTIFICATIONS: {
        pollIntervalMs: 60000, // placeholder until backend polling/websocket exists
        maxBadgeCount: 9, // show "9+" beyond this
    },

    // ---------------------------------------------------------------
    // Formatting defaults (consumed by utils/formatter.js)
    // ---------------------------------------------------------------
    FORMAT: {
        locale: 'en-US',
        currency: 'USD',
        currencySymbol: '$',
        dateStyle: 'medium', // e.g. "Aug 15, 2026"
        timeStyle: 'short', // e.g. "09:00 AM"
    },

    // ---------------------------------------------------------------
    // Pagination / list defaults (assignments, courses, notices, etc.)
    // ---------------------------------------------------------------
    PAGINATION: {
        defaultPageSize: 10,
        pageSizeOptions: [10, 20, 50],
    },

    // ---------------------------------------------------------------
    // API — placeholder until a real backend is wired in. Every page
    // module should build requests from API.baseUrl + API.endpoints.*
    // rather than hardcoding paths, so swapping in a real backend later
    // is a one-line change here.
    // ---------------------------------------------------------------
    API: {
        baseUrl: '', // e.g. 'https://api.codequantum.dev' — empty while using mock/local data
        endpoints: {
            assignments: '/assignments',
            attendance: '/attendance',
            courses: '/courses',
            dashboard: '/dashboard',
            fees: '/fees',
            notices: '/notices',
            profile: '/profile',
            results: '/results',
            settings: '/settings',
            timetable: '/timetable',
        },
        timeoutMs: 8000,
    },

    // ---------------------------------------------------------------
    // Feature flags — toggle in-progress features without ripping
    // code out; flip to true once a feature is ready to ship.
    // ---------------------------------------------------------------
    FEATURES: {
        darkMode: true,
        liveNotifications: false,
        onlinePayments: false,
    },

};

// Freeze to catch accidental mutation of shared config at runtime.
Object.freeze(CONFIG);
Object.values(CONFIG).forEach((section) => {
    if (typeof section === 'object' && section !== null) {
        Object.freeze(section);
    }
});

export default CONFIG;