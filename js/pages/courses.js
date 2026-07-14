/**
 * courses.js
 * Page script for the Courses page — enrolled subjects, each with a
 * progress indicator and a link into that subject's materials/results.
 *
 * This is the other page named directly in navbar.js's search docs
 * ("Page scripts (assignments.js, courses.js, etc.) each listen for
 * that event and filter their own data").
 *
 * Consumes: constants.js (SUBJECTS), storage.js, formatter.js,
 * helpers.js (qs/qsa/delegate).
 */

document.addEventListener('DOMContentLoaded', initCoursesPage);

function initCoursesPage() {
    renderCourseList();
    wireSearch();
    wireCourseClicks();
}

/* ---------------------------------------------------------------- */
/* Data                                                                */
/* ---------------------------------------------------------------- */

function getEnrolledCourses() {
    // Shape: [{ subject (a SUBJECTS key), teacher, progress (0-1), materialsCount }]
    // Falls back to one entry per SUBJECTS key at 0 progress so the page
    // still renders something sensible before real enrollment data exists,
    // rather than showing a blank grid.
    const stored = getFromStorage(CONFIG.STORAGE_KEYS.courses);
    if (stored && stored.length > 0) return stored;

    return Object.keys(SUBJECTS).map((subjectKey) => ({
        subject: subjectKey,
        teacher: '',
        progress: 0,
        materialsCount: 0,
    }));
}

/* ---------------------------------------------------------------- */
/* Rendering                                                          */
/* ---------------------------------------------------------------- */

function renderCourseList() {
    const container = qs('#coursesGrid');
    if (!container) return;

    const courses = getEnrolledCourses();

    if (courses.length === 0) {
        container.innerHTML = `<p class="empty-state">${UI_TEXT.emptyState}</p>`;
        return;
    }

    container.innerHTML = courses.map(renderCourseCard).join('');
}

function renderCourseCard(course) {
    const label = SUBJECTS[course.subject] || course.subject;
    const progressPct = formatPercentage(course.progress);

    return `
    <li class="course-card subject-${course.subject}" data-subject="${course.subject}">
      <div class="course-card-header">
        <span class="course-subject-badge subject-${course.subject}">${label}</span>
      </div>
      <h4 class="course-card-title">${label}</h4>
      ${course.teacher ? `<p class="course-teacher">${course.teacher}</p>` : ''}
      <div class="course-progress-track">
        <div class="course-progress-fill subject-${course.subject}" style="width: ${progressPct}"></div>
      </div>
      <p class="course-progress-label">${progressPct} complete</p>
      <p class="course-materials-count">${course.materialsCount} materials</p>
      <button type="button" class="btn-view-course" data-subject="${course.subject}">View course</button>
    </li>
  `;
}

/* ---------------------------------------------------------------- */
/* Interactions                                                       */
/* ---------------------------------------------------------------- */

function wireCourseClicks() {
  const container = qs('#coursesGrid');
  if (!container) return;

  // Dispatches a cq: event rather than navigating directly, since where
  // "view course" actually goes (a materials page? a filtered results
  // view?) isn't decided by this file — same hand-off pattern navbar.js
  // used for its notification bell before that panel existed.
  delegate(container, 'click', '.btn-view-course', (e, btn) => {
    document.dispatchEvent(
      new CustomEvent('cq:course-selected', { detail: { subject: btn.dataset.subject } })
    );
  });
}

/* ---------------------------------------------------------------- */
/* Global search (navbar) integration                                 */
/* ---------------------------------------------------------------- */

function wireSearch() {
  document.addEventListener('cq:search', (e) => {
    const query = (e.detail.query || '').trim().toLowerCase();
    qsa('#coursesGrid .course-card').forEach((card) => {
      const titleEl = card.querySelector('.course-card-title');
      const text = titleEl ? titleEl.textContent.toLowerCase() : '';
      const matches = query === '' || text.includes(query);
      card.classList.toggle('search-hidden', !matches);
    });
  });
}