/**
 * dashboard.js
 * Page script for the student portal's dashboard/home page.
 * Consumes: constants.js (CONSTANTS), storage.js, formatter.js, helpers.js,
 * and the shared components (sidebar.js/navbar.js are initialized globally,
 * not here).
 *
 * Convention carried over from components: this file owns dashboard-specific
 * data and rendering only. It listens for the navbar's cq:search event but
 * does not know how navbar.js implements search.
 */

document.addEventListener('DOMContentLoaded', initDashboard);

function initDashboard() {
    renderSummaryCards();
    renderUpcomingAssignments();
    renderRecentNotices();
    renderTodayTimetable();
    wireSearch();
}

/**
 * Top summary cards: attendance %, pending fees, upcoming assignments count,
 * unread notices count. Placeholder data until config.js's API.baseUrl is wired
 * to a real backend — structured so swapping localStorage reads for fetch()
 * calls later doesn't change any rendering code below.
 */
function renderSummaryCards() {
    const summary = getDashboardSummary();

    const attendanceEl = qs('#attendanceSummary .card-value');
    const feesEl = qs('#feesSummary .card-value');
    const assignmentsEl = qs('#assignmentsSummary .card-value');
    const noticesEl = qs('#noticesSummary .card-value');

    if (attendanceEl) attendanceEl.textContent = formatPercentage(summary.attendanceRate);
    if (feesEl) feesEl.textContent = formatCurrency(summary.pendingFees);
    if (assignmentsEl) assignmentsEl.textContent = summary.upcomingAssignmentsCount;
    if (noticesEl) noticesEl.textContent = summary.unreadNoticesCount;
}

function getDashboardSummary() {
    // Placeholder shape — mirrors what a future GET /api/dashboard/summary
    // response would look like, so this function is the only thing that
    // changes when a real API exists.
    return {
        attendanceRate: 0.92,
        pendingFees: 15000,
        upcomingAssignmentsCount: getUpcomingAssignments().length,
        unreadNoticesCount: getRecentNotices().filter((n) => !n.read).length,
    };
}

/**
 * Upcoming assignments list, soonest due date first, capped to a handful
 * for the dashboard widget (full list lives on assignments.js's page).
 */
function renderUpcomingAssignments() {
    const container = qs('#upcomingAssignmentsList');
    if (!container) return;

    const assignments = getUpcomingAssignments()
        .slice()
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 5);

    if (assignments.length === 0) {
        container.innerHTML = `<p class="empty-state">${UI_TEXT.emptyState}</p>`;
        return;
    }

    container.innerHTML = assignments
        .map(
            (a) => `
      <li class="assignment-item" data-subject="${a.subject}">
        <span class="assignment-subject subject-${a.subject}">${a.subjectLabel}</span>
        <span class="assignment-title">${a.title}</span>
        <span class="assignment-due">${formatDate(a.dueDate)}</span>
        <span class="assignment-status status-${a.status}">${a.status}</span>
      </li>
    `
        )
        .join('');
}

function getUpcomingAssignments() {
    // Reads from storage.js once assignment data actually gets persisted there;
    // returns [] until then rather than fabricating fake records.
    return getFromStorage(CONFIG.STORAGE_KEYS.assignments) || [];
}

/**
 * Recent notices/announcements feed.
 */
function renderRecentNotices() {
    const container = qs('#recentNoticesList');
    if (!container) return;

    const notices = getRecentNotices().slice(0, 5);

    if (notices.length === 0) {
        container.innerHTML = `<p class="empty-state">${UI_TEXT.emptyState}</p>`;
        return;
    }

    container.innerHTML = notices
        .map(
            (n) => `
      <li class="notice-item ${n.read ? '' : 'notice-unread'}" data-id="${n.id}">
        <span class="notice-title">${n.title}</span>
        <span class="notice-date">${formatDate(n.date)}</span>
      </li>
    `
        )
        .join('');

    delegate(container, 'click', '.notice-item', (e, itemEl) => {
        markNoticeAsRead(itemEl.dataset.id);
        itemEl.classList.remove('notice-unread');
    });
}

function getRecentNotices() {
    return getFromStorage(CONFIG.STORAGE_KEYS.notices) || [];
}

function markNoticeAsRead(id) {
    const notices = getRecentNotices();
    const notice = notices.find((n) => String(n.id) === String(id));
    if (notice) notice.read = true;
    saveToStorage(CONFIG.STORAGE_KEYS.notices, notices);
}

/**
 * Today's timetable strip — filters TIMETABLE_DAYS/SUBJECTS-driven data
 * down to whatever day it is right now.
 */
function renderTodayTimetable() {
    const container = qs('#todayTimetableList');
    if (!container) return;

    const todayName = DAY_NAMES[new Date().getDay()];
    const isTimetableDay = TIMETABLE_DAYS.includes(todayName);

    if (!isTimetableDay) {
        container.innerHTML = `<p class="empty-state">No classes today.</p>`;
        return;
    }

    const periods = getTimetableForDay(todayName);

    if (periods.length === 0) {
        container.innerHTML = `<p class="empty-state">${UI_TEXT.emptyState}</p>`;
        return;
    }

    container.innerHTML = periods
        .map(
            (p) => `
      <li class="timetable-period subject-${p.subject}">
        <span class="period-time">${p.time}</span>
        <span class="period-subject">${p.subjectLabel}</span>
      </li>
    `
        )
        .join('');
}

function getTimetableForDay(dayName) {
    const timetable = getFromStorage(CONFIG.STORAGE_KEYS.timetable) || {};
    return timetable[dayName] || [];
}

/**
 * Dashboard's own reaction to the navbar's global search box: a lightweight
 * cross-widget filter (dims non-matching assignment/notice items) rather
 * than a full search results page, since that's out of scope for the home page.
 */
function wireSearch() {
    document.addEventListener('cq:search', (e) => {
        const query = (e.detail.query || '').trim().toLowerCase();
        filterListByQuery('#upcomingAssignmentsList .assignment-item', query, '.assignment-title');
        filterListByQuery('#recentNoticesList .notice-item', query, '.notice-title');
    });
}

function filterListByQuery(itemSelector, query, textSelector) {
    qsa(itemSelector).forEach((item) => {
        const textEl = item.querySelector(textSelector);
        const text = textEl ? textEl.textContent.toLowerCase() : '';
        const matches = query === '' || text.includes(query);
        item.classList.toggle('search-hidden', !matches);
    });
}