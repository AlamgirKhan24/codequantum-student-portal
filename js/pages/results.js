/**
 * results.js
 * Page script for the Results/Grades page — per-subject scores, computed
 * letter grades, and an overall performance chart-free summary (no chart
 * lib wired up yet, just numeric summaries).
 *
 * Consumes: constants.js (SUBJECTS, GRADE_SCALE), storage.js,
 * formatter.js, helpers.js (qs/qsa/delegate/sumBy).
 */

document.addEventListener('DOMContentLoaded', initResultsPage);

function initResultsPage() {
    renderOverallSummary();
    renderResultsTable();
    wireSearch();
}

/* ---------------------------------------------------------------- */
/* Data                                                                */
/* ---------------------------------------------------------------- */

function getResults() {
    // Shape: [{ id, subject, subjectLabel, score (0-100), examLabel, date }]
    return getFromStorage(CONFIG.STORAGE_KEYS.results) || [];
}

/**
 * Computes a letter grade from a numeric score using GRADE_SCALE from
 * constants.js — this is the exact use case that table was documented for
 * ("compute a letter grade from a numeric score rather than hardcoding
 * per subject").
 */
function getGradeForScore(score) {
    // GRADE_SCALE assumed shape: array of { minScore, grade }, sorted
    // descending by minScore, e.g. [{ minScore: 90, grade: 'A+' }, ...].
    const match = GRADE_SCALE.find((tier) => score >= tier.minScore);
    return match ? match.grade : GRADE_SCALE[GRADE_SCALE.length - 1].grade;
}

/* ---------------------------------------------------------------- */
/* Overall summary cards                                              */
/* ---------------------------------------------------------------- */

function renderOverallSummary() {
    const results = getResults();

    const averageEl = qs('#resultsAverage .card-value');
    const highestEl = qs('#resultsHighest .card-value');
    const gradeEl = qs('#resultsOverallGrade .card-value');

    if (results.length === 0) {
        if (averageEl) averageEl.textContent = '—';
        if (highestEl) highestEl.textContent = '—';
        if (gradeEl) gradeEl.textContent = '—';
        return;
    }

    const totalScore = sumBy(results, (r) => r.score);
    const average = totalScore / results.length;
    const highest = Math.max(...results.map((r) => r.score));

    if (averageEl) averageEl.textContent = average.toFixed(1);
    if (highestEl) highestEl.textContent = highest;
    if (gradeEl) gradeEl.textContent = getGradeForScore(average);
}

/* ---------------------------------------------------------------- */
/* Per-subject results table, grouped by subject                      */
/* ---------------------------------------------------------------- */

function renderResultsTable() {
    const container = qs('#resultsTableBody');
    if (!container) return;

    const results = getResults();

    if (results.length === 0) {
        container.innerHTML = `<tr><td colspan="5" class="empty-state">${UI_TEXT.emptyState}</td></tr>`;
        return;
    }

    // Grouped by subject so each SUBJECTS entry gets its own section,
    // mirroring the results.css .html-progress color-coding hook noted
    // when SUBJECTS was defined in constants.js.
    const grouped = groupBy(results, (r) => r.subject);

    container.innerHTML = Object.entries(grouped)
        .map(([subject, subjectResults]) => renderSubjectSection(subject, subjectResults))
        .join('');
}

function renderSubjectSection(subject, results) {
    const subjectAverage = sumBy(results, (r) => r.score) / results.length;

    const rows = results
        .slice()
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map(
            (r) => `
      <tr class="result-row subject-${r.subject}" data-id="${r.id}">
        <td class="result-exam">${r.examLabel}</td>
        <td class="result-score">${r.score}</td>
        <td class="result-grade">${getGradeForScore(r.score)}</td>
        <td class="result-date">${formatDate(r.date)}</td>
      </tr>
    `
        )
        .join('');

    return `
    <tbody class="results-subject-group subject-${subject}">
      <tr class="results-subject-header">
        <th colspan="2">${SUBJECTS[subject] || subject}</th>
        <th colspan="2">Avg: ${subjectAverage.toFixed(1)} (${getGradeForScore(subjectAverage)})</th>
      </tr>
      ${rows}
    </tbody>
  `;
}

/* ---------------------------------------------------------------- */
/* Global search (navbar) integration                                 */
/* ---------------------------------------------------------------- */

function wireSearch() {
    document.addEventListener('cq:search', (e) => {
        const query = (e.detail.query || '').trim().toLowerCase();
        qsa('#resultsTableBody .result-row').forEach((row) => {
            const examEl = row.querySelector('.result-exam');
            const text = examEl ? examEl.textContent.toLowerCase() : '';
            const matches = query === '' || text.includes(query);
            row.classList.toggle('search-hidden', !matches);
        });
    });
}