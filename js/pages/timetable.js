/**
 * timetable.js
 * Page script for the full weekly Timetable page (dashboard.js only shows
 * a single-day strip pulled from the same storage key).
 *
 * Consumes: constants.js (TIMETABLE_DAYS, SUBJECTS), storage.js,
 * helpers.js (qs/qsa/delegate), modal.js (add/edit period dialog).
 */

document.addEventListener('DOMContentLoaded', initTimetablePage);

function initTimetablePage() {
    ensurePeriodModalExists();
    renderTimetableGrid();
    wireSearch();
}

/* ---------------------------------------------------------------- */
/* Data                                                               */
/* ---------------------------------------------------------------- */

function getTimetable() {
    // Shape: { [dayName]: [{ id, time, subject, subjectLabel }, ...] }
    // Same storage key and shape dashboard.js's renderTodayTimetable()
    // already reads from — this page is the one that actually writes it.
    return getFromStorage(CONFIG.STORAGE_KEYS.timetable) || {};
}

function saveTimetable(timetable) {
    saveToStorage(CONFIG.STORAGE_KEYS.timetable, timetable);
}

/* ---------------------------------------------------------------- */
/* Rendering                                                          */
/* ---------------------------------------------------------------- */

function renderTimetableGrid() {
    const container = qs('#timetableGrid');
    if (!container) return;

    const timetable = getTimetable();

    // TIMETABLE_DAYS is the Mon–Sat set (no Sunday column) defined in
    // constants.js specifically for this table.
    container.innerHTML = TIMETABLE_DAYS.map((day) => renderDayColumn(day, timetable[day] || [])).join('');
}

function renderDayColumn(day, periods) {
    const sorted = periods.slice().sort((a, b) => a.time.localeCompare(b.time));

    return `
    <section class="timetable-day" data-day="${day}">
      <h3 class="timetable-day-title">${day}</h3>
      <ul class="timetable-period-list">
        ${
          sorted.length > 0
            ? sorted.map((p) => renderPeriodRow(day, p)).join('')
            : `<li class="empty-state">${UI_TEXT.emptyState}</li>`
        }
      </ul>
      <button type="button" class="btn-add-period" data-modal-open="periodFormModal" data-day="${day}">+ Add period</button>
    </section>
  `;
}

function renderPeriodRow(day, period) {
  return `
    <li class="timetable-period subject-${period.subject}" data-id="${period.id}" data-day="${day}">
      <span class="period-time">${period.time}</span>
      <span class="period-subject">${period.subjectLabel}</span>
      <button type="button" class="btn-edit-period" data-modal-open="periodFormModal" data-day="${day}" data-edit-id="${period.id}">Edit</button>
      <button type="button" class="btn-delete-period" data-day="${day}" data-delete-id="${period.id}">&times;</button>
    </li>
  `;
}

/* ---------------------------------------------------------------- */
/* Add / edit / delete period                                         */
/* ---------------------------------------------------------------- */

function ensurePeriodModalExists() {
  createModal({
    id: 'periodFormModal',
    title: 'Class period',
    bodyHTML: `
      <form id="periodForm" novalidate>
        <input type="hidden" id="periodId" />
        <input type="hidden" id="periodDay" />

        <label for="periodTime">Time</label>
        <input type="time" id="periodTime" required />
        <span class="field-error" data-error-for="periodTime"></span>

        <label for="periodSubject">Subject</label>
        <select id="periodSubject">
          ${Object.entries(SUBJECTS)
            .map(([key, label]) => `<option value="${key}">${label}</option>`)
            .join('')}
        </select>
      </form>
    `,
    footerHTML: `
      <button type="button" data-modal-close>Cancel</button>
      <button type="button" id="savePeriodBtn">Save</button>
    `,
  });

  qs('#savePeriodBtn')?.addEventListener('click', handleSavePeriod);

  const grid = qs('#timetableGrid');
  if (grid) {
    delegate(grid, 'click', '.btn-add-period', (e, btn) => {
      resetPeriodForm(btn.dataset.day);
    });
    delegate(grid, 'click', '.btn-edit-period', (e, btn) => {
      prefillPeriodForm(btn.dataset.day, btn.dataset.editId);
    });
    delegate(grid, 'click', '.btn-delete-period', (e, btn) => {
      deletePeriod(btn.dataset.day, btn.dataset.deleteId);
    });
  }
}

function resetPeriodForm(day) {
  qs('#periodId').value = '';
  qs('#periodDay').value = day;
  qs('#periodTime').value = '';
  clearFieldErrors();
}

function prefillPeriodForm(day, periodId) {
  const timetable = getTimetable();
  const period = (timetable[day] || []).find((p) => String(p.id) === String(periodId));
  if (!period) return;

  qs('#periodId').value = period.id;
  qs('#periodDay').value = day;
  qs('#periodTime').value = period.time;
  qs('#periodSubject').value = period.subject;
  clearFieldErrors();
}

function clearFieldErrors() {
  qsa('.field-error').forEach((el) => (el.textContent = ''));
}

function handleSavePeriod() {
  const time = qs('#periodTime').value;
  const timeCheck = isRequired(time, 'Time');

  clearFieldErrors();
  if (!timeCheck.valid) {
    setFieldError('periodTime', timeCheck.message);
    return;
  }

  const day = qs('#periodDay').value;
  const subject = qs('#periodSubject').value;
  const id = qs('#periodId').value || generateId();

  const record = {
    id,
    time,
    subject,
    subjectLabel: SUBJECTS[subject],
  };

  const timetable = getTimetable();
  const dayPeriods = timetable[day] || [];
  const existingIndex = dayPeriods.findIndex((p) => String(p.id) === String(id));
  if (existingIndex !== -1) {
    dayPeriods[existingIndex] = record;
  } else {
    dayPeriods.push(record);
  }
  timetable[day] = dayPeriods;
  saveTimetable(timetable);

  closeModal('periodFormModal');
  renderTimetableGrid();
}

function setFieldError(fieldId, message) {
  const errorEl = qs(`[data-error-for="${fieldId}"]`);
  if (errorEl) errorEl.textContent = message;
}

function deletePeriod(day, periodId) {
  const timetable = getTimetable();
  timetable[day] = (timetable[day] || []).filter((p) => String(p.id) !== String(periodId));
  saveTimetable(timetable);
  renderTimetableGrid();
}

/* ---------------------------------------------------------------- */
/* Global search (navbar) integration                                 */
/* ---------------------------------------------------------------- */

function wireSearch() {
  document.addEventListener('cq:search', (e) => {
    const query = (e.detail.query || '').trim().toLowerCase();
    qsa('#timetableGrid .timetable-period').forEach((item) => {
      const subjectEl = item.querySelector('.period-subject');
      const text = subjectEl ? subjectEl.textContent.toLowerCase() : '';
      const matches = query === '' || text.includes(query);
      item.classList.toggle('search-hidden', !matches);
    });
  });
}