/**
 * pages/attendance.js
 * Progressive enhancement for the (static) Attendance page:
 *   - global navbar search filters the history table rows
 *   - a live "no results" row when a search matches nothing
 *   - export / primary buttons give toast feedback (no backend yet)
 *
 * The markup is authored directly in attendance.html; this script never
 * rebuilds it, it only reads and filters what's already there.
 */

document.addEventListener('DOMContentLoaded', initAttendancePage);

let attendanceRows = [];
let attendanceBodyEl = null;

function initAttendancePage() {
    const table = qs('.attendance-history table');
    attendanceBodyEl = table ? qs('tbody', table) : null;
    if (attendanceBodyEl) {
        attendanceRows = qsa('tr', attendanceBodyEl);
    }

    wireAttendanceSearch();
    wireAttendanceButtons();
}

function wireAttendanceSearch() {
    if (!attendanceBodyEl) return;

    document.addEventListener('cq:search', (e) => {
        filterAttendance((e.detail?.query || '').toLowerCase());
    });
}

function filterAttendance(query) {
    let visible = 0;

    attendanceRows.forEach((row) => {
        if (row.classList.contains('attendance-empty-row')) return;
        const match = !query || row.textContent.toLowerCase().includes(query);
        row.style.display = match ? '' : 'none';
        if (match) visible += 1;
    });

    toggleAttendanceEmpty(visible === 0);
}

function toggleAttendanceEmpty(show) {
    let emptyRow = qs('.attendance-empty-row', attendanceBodyEl);

    if (show && !emptyRow) {
        emptyRow = document.createElement('tr');
        emptyRow.className = 'attendance-empty-row';
        const cell = document.createElement('td');
        cell.colSpan = 5;
        cell.className = 'attendance-empty-cell';
        cell.textContent = 'No attendance records match your search.';
        emptyRow.appendChild(cell);
        attendanceBodyEl.appendChild(emptyRow);
    } else if (!show && emptyRow) {
        emptyRow.remove();
    }
}

function wireAttendanceButtons() {
    qsa('.attendance-page .primary-btn').forEach((btn) => {
        const label = btn.textContent.trim().toLowerCase();
        btn.addEventListener('click', () => {
            if (typeof showToast !== 'function') return;
            if (label.includes('export')) {
                showToast('Your attendance report is being prepared.', 'info');
            } else {
                showToast('Feature coming soon.', 'info');
            }
        });
    });
}
