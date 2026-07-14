/**
 * utils/constants.js
 * Shared constants used across pages and components. Anything that's a
 * literal string/value repeated in more than one place (status labels,
 * day names, subject keys, icon class name fragments, etc.) belongs here
 * instead of being retyped per-page — keeps status labels, CSS class
 * suffixes, and display text from drifting out of sync between pages.
 */

// ---------------------------------------------------------------
// Status labels — used by attendance, assignments, fees, results
// Keep these in sync with the CSS status/badge modifier classes
// (.status.present/.absent/.leave, .payment-status.paid/.pending, etc.)
// ---------------------------------------------------------------
export const ATTENDANCE_STATUS = Object.freeze({
    PRESENT: 'present',
    ABSENT: 'absent',
    LEAVE: 'leave',
});

export const PAYMENT_STATUS = Object.freeze({
    PAID: 'paid',
    PENDING: 'pending',
    OVERDUE: 'overdue',
});

export const ASSIGNMENT_STATUS = Object.freeze({
    SUBMITTED: 'submitted',
    PENDING: 'pending',
    OVERDUE: 'overdue',
    GRADED: 'graded',
});

// ---------------------------------------------------------------
// Calendar / scheduling
// ---------------------------------------------------------------
export const DAYS_OF_WEEK = Object.freeze([
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
]);

export const WEEKDAYS_SHORT = Object.freeze([
    'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat',
]);

// Matches the columns used in timetable.html's weekly schedule table
export const TIMETABLE_DAYS = Object.freeze([
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
]);

// ---------------------------------------------------------------
// Subjects — keys map to the CSS class suffixes used for color-coding
// (.html-class/.css-class/.js-class/.react-class/.ui-class in timetable.css,
// .html-progress/.css-progress/.js-progress/.react-progress in results.css)
// ---------------------------------------------------------------
export const SUBJECTS = Object.freeze({
    HTML: { key: 'html', label: 'HTML Fundamentals' },
    CSS: { key: 'css', label: 'CSS Mastery' },
    JS: { key: 'js', label: 'JavaScript' },
    REACT: { key: 'react', label: 'React Development' },
    UI: { key: 'ui', label: 'UI Design' },
});

// ---------------------------------------------------------------
// Grades (results.js)
// ---------------------------------------------------------------
export const GRADE_SCALE = Object.freeze([
    { min: 90, grade: 'A+' },
    { min: 85, grade: 'A' },
    { min: 80, grade: 'A-' },
    { min: 75, grade: 'B+' },
    { min: 70, grade: 'B' },
    { min: 60, grade: 'C' },
    { min: 50, grade: 'D' },
    { min: 0, grade: 'F' },
]);

// ---------------------------------------------------------------
// Fee breakdown categories (fees.js) — keys match .tuition-fill/.library-fill/
// .lab-fill/.transport-fill class suffixes in fees.css
// ---------------------------------------------------------------
export const FEE_CATEGORIES = Object.freeze({
    TUITION: 'tuition',
    LIBRARY: 'library',
    LAB: 'lab',
    TRANSPORT: 'transport',
});

// ---------------------------------------------------------------
// Navigation — single source of truth for sidebar links, so navbar.js/
// sidebar.js can render or highlight the active link programmatically
// instead of relying only on hardcoded HTML + aria-current per page.
// ---------------------------------------------------------------
export const NAV_ITEMS = Object.freeze([
    { key: 'dashboard', label: 'Dashboard', href: '../index.html', icon: 'fa-solid fa-house' },
    { key: 'profile', label: 'Profile', href: 'profile.html', icon: 'fa-solid fa-user' },
    { key: 'courses', label: 'Courses', href: 'courses.html', icon: 'fa-solid fa-book-open' },
    { key: 'assignments', label: 'Assignments', href: 'assignments.html', icon: 'fa-solid fa-file-lines' },
    { key: 'attendance', label: 'Attendance', href: 'attendance.html', icon: 'fa-solid fa-calendar-check' },
    { key: 'timetable', label: 'Timetable', href: 'timetables.html', icon: 'fa-solid fa-clock' },
    { key: 'results', label: 'Results', href: 'results.html', icon: 'fa-solid fa-chart-column' },
    { key: 'fees', label: 'Fees', href: 'fees.html', icon: 'fa-solid fa-wallet' },
]);

// ---------------------------------------------------------------
// Misc UI text
// ---------------------------------------------------------------
export const UI_TEXT = Object.freeze({
    noDataFallback: '—',
    loading: 'Loading…',
    genericError: 'Something went wrong. Please try again.',
});