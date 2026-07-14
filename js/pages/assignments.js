/**
 * assignments.js
 * Page script for the full Assignments page (dashboard.js only shows a
 * capped preview of this same data).
 *
 * Consumes: constants.js (ASSIGNMENT_STATUS, SUBJECTS), storage.js,
 * formatter.js, validators.js, helpers.js (qs/qsa/delegate/groupBy),
 * and modal.js (for the "add/edit assignment" dialog).
 */

document.addEventListener('DOMContentLoaded', initAssignmentsPage);

// In-memory filter/sort state for this page only — not persisted,
// resets to defaults on reload (same choice made for the mobile
// sidebar overlay state in sidebar.js).
const state = {
    statusFilter: 'all', // 'all' | ASSIGNMENT_STATUS.*
    subjectFilter: 'all', // 'all' | a SUBJECTS key
    sortBy: 'dueDate', // 'dueDate' | 'subject' | 'status'
    searchQuery: '',
};

function initAssignmentsPage() {
    ensureAssignmentModalExists();
    renderAssignments();
    wireFilterControls();
    wireSearch();
    wireAddAssignmentButton();
}

/* ---------------------------------------------------------------- */
/* Data                                                              */
/* ---------------------------------------------------------------- */

function getAllAssignments() {
    return getFromStorage(CONFIG.STORAGE_KEYS.assignments) || [];
}

function saveAllAssignments(assignments) {
    saveToStorage(CONFIG.STORAGE_KEYS.assignments, assignments);
}

function getVisibleAssignments() {
    let list = getAllAssignments();

    if (state.statusFilter !== 'all') {
        list = list.filter((a) => a.status === state.statusFilter);
    }
    if (state.subjectFilter !== 'all') {
        list = list.filter((a) => a.subject === state.subjectFilter);
    }
    if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        list = list.filter((a) => a.title.toLowerCase().includes(q));
    }

    return sortAssignments(list, state.sortBy);
}

function sortAssignments(list, sortBy) {
    const sorted = list.slice();
    if (sortBy === 'dueDate') {
        sorted.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    } else if (sortBy === 'subject') {
        sorted.sort((a, b) => a.subjectLabel.localeCompare(b.subjectLabel));
    } else if (sortBy === 'status') {
        sorted.sort((a, b) => a.status.localeCompare(b.status));
    }
    return sorted;
}

/* ---------------------------------------------------------------- */
/* Rendering                                                         */
/* ---------------------------------------------------------------- */

function renderAssignments() {
    const container = qs('#assignmentsGrid');
    if (!container) return;

    const assignments = getVisibleAssignments();

    if (assignments.length === 0) {
        container.innerHTML = `<p class="empty-state">${UI_TEXT.emptyState}</p>`;
        return;
    }

    // Grouped by status so the page reads as three columns/sections
    // (Pending / Submitted / Graded etc.) rather than one flat list —
    // uses helpers.js's groupBy, matching how it was described for this
    // exact use case when helpers.js was built.
    const grouped = groupBy(assignments, (a) => a.status);

    container.innerHTML = Object.entries(grouped)
        .map(
            ([status, items]) => `
      <section class="assignment-group" data-status="${status}">
        <h3 class="assignment-group-title status-${status}">${capitalize(status)} (${items.length})</h3>
        <ul class="assignment-list">
          ${items.map(renderAssignmentCard).join('')}
        </ul>
      </section>
    `
        )
        .join('');
}

function renderAssignmentCard(a) {
    return `
    <li class="assignment-card subject-${a.subject}" data-id="${a.id}">
      <div class="assignment-card-header">
        <span class="assignment-subject subject-${a.subject}">${a.subjectLabel}</span>
        <span class="assignment-status status-${a.status}">${a.status}</span>
      </div>
      <h4 class="assignment-card-title">${a.title}</h4>
      <p class="assignment-card-due">Due ${formatDate(a.dueDate)}</p>
      <div class="assignment-card-actions">
        <button type="button" class="btn-edit" data-modal-open="assignmentFormModal" data-edit-id="${a.id}">Edit</button>
        <button type="button" class="btn-delete" data-delete-id="${a.id}">Delete</button>
      </div>
    </li>
  `;
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/* ---------------------------------------------------------------- */
/* Filter / sort / search controls                                   */
/* ---------------------------------------------------------------- */

function wireFilterControls() {
    const statusSelect = qs('#assignmentStatusFilter');
    const subjectSelect = qs('#assignmentSubjectFilter');
    const sortSelect = qs('#assignmentSortBy');

    if (statusSelect) {
        statusSelect.addEventListener('change', (e) => {
            state.statusFilter = e.target.value;
            renderAssignments();
        });
    }
    if (subjectSelect) {
        subjectSelect.addEventListener('change', (e) => {
            state.subjectFilter = e.target.value;
            renderAssignments();
        });
    }
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            state.sortBy = e.target.value;
            renderAssignments();
        });
    }

    // Delete + edit-prefill both handled via delegation on the grid,
    // since cards are re-rendered wholesale on every filter change.
    const container = qs('#assignmentsGrid');
    if (container) {
        delegate(container, 'click', '.btn-delete', (e, btn) => {
            deleteAssignment(btn.dataset.deleteId);
        });
        delegate(container, 'click', '.btn-edit', (e, btn) => {
            prefillAssignmentForm(btn.dataset.editId);
        });
    }
}

/* ---------------------------------------------------------------- */
/* Global search (navbar) integration                                */
/* ---------------------------------------------------------------- */

function wireSearch() {
    document.addEventListener('cq:search', (e) => {
        state.searchQuery = (e.detail.query || '').trim();
        renderAssignments();
    });
}

/* ---------------------------------------------------------------- */
/* Add / edit assignment modal                                       */
/* ---------------------------------------------------------------- */

function ensureAssignmentModalExists() {
    // Built dynamically via modal.js's createModal() rather than static
    // HTML, per the "no dropdown/modal markup exists yet" caveat noted
    // when modal.js was written.
    createModal({
                id: 'assignmentFormModal',
                title: 'Assignment',
                bodyHTML: `
      <form id="assignmentForm" novalidate>
        <input type="hidden" id="assignmentId" />
        <label for="assignmentTitle">Title</label>
        <input type="text" id="assignmentTitle" required />
        <span class="field-error" data-error-for="assignmentTitle"></span>

        <label for="assignmentSubject">Subject</label>
        <select id="assignmentSubject">
          ${Object.entries(SUBJECTS)
            .map(([key, label]) => `<option value="${key}">${label}</option>`)
            .join('')}
        </select>

        <label for="assignmentDueDate">Due date</label>
        <input type="date" id="assignmentDueDate" required />
        <span class="field-error" data-error-for="assignmentDueDate"></span>

        <label for="assignmentStatus">Status</label>
        <select id="assignmentStatus">
          ${Object.values(ASSIGNMENT_STATUS)
            .map((s) => `<option value="${s}">${capitalize(s)}</option>`)
            .join('')}
        </select>
      </form>
    `,
    footerHTML: `
      <button type="button" data-modal-close>Cancel</button>
      <button type="button" id="saveAssignmentBtn">Save</button>
    `,
  });

  qs('#saveAssignmentBtn')?.addEventListener('click', handleSaveAssignment);
}

function wireAddAssignmentButton() {
  const addBtn = qs('#addAssignmentBtn');
  if (!addBtn) return;
  addBtn.addEventListener('click', () => {
    resetAssignmentForm();
    openModal('assignmentFormModal', { trigger: addBtn });
  });
}

function resetAssignmentForm() {
  qs('#assignmentId').value = '';
  qs('#assignmentTitle').value = '';
  qs('#assignmentDueDate').value = '';
  clearFieldErrors();
}

function prefillAssignmentForm(id) {
  const assignment = getAllAssignments().find((a) => String(a.id) === String(id));
  if (!assignment) return;

  qs('#assignmentId').value = assignment.id;
  qs('#assignmentTitle').value = assignment.title;
  qs('#assignmentSubject').value = assignment.subject;
  qs('#assignmentDueDate').value = assignment.dueDate;
  qs('#assignmentStatus').value = assignment.status;
  clearFieldErrors();
}

function clearFieldErrors() {
  qsa('.field-error').forEach((el) => (el.textContent = ''));
}

function handleSaveAssignment() {
  const title = qs('#assignmentTitle').value.trim();
  const dueDate = qs('#assignmentDueDate').value;

  const titleCheck = isRequired(title, 'Title');
  const dateCheck = composeValidators([
    () => isRequired(dueDate, 'Due date'),
    () => isValidDate(dueDate),
  ]);

  clearFieldErrors();
  let hasError = false;

  if (!titleCheck.valid) {
    setFieldError('assignmentTitle', titleCheck.message);
    hasError = true;
  }
  if (!dateCheck.valid) {
    setFieldError('assignmentDueDate', dateCheck.message);
    hasError = true;
  }
  if (hasError) return;

  const id = qs('#assignmentId').value || generateId();
  const subject = qs('#assignmentSubject').value;
  const status = qs('#assignmentStatus').value;

  const record = {
    id,
    title,
    subject,
    subjectLabel: SUBJECTS[subject],
    dueDate,
    status,
  };

  const assignments = getAllAssignments();
  const existingIndex = assignments.findIndex((a) => String(a.id) === String(id));
  if (existingIndex !== -1) {
    assignments[existingIndex] = record;
  } else {
    assignments.push(record);
  }
  saveAllAssignments(assignments);

  closeModal('assignmentFormModal');
  renderAssignments();
}

function setFieldError(fieldId, message) {
  const errorEl = qs(`[data-error-for="${fieldId}"]`);
  if (errorEl) errorEl.textContent = message;
}

function deleteAssignment(id) {
  const assignments = getAllAssignments().filter((a) => String(a.id) !== String(id));
  saveAllAssignments(assignments);
  renderAssignments();
}