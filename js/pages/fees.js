/**
 * fees.js
 * Page script for the Fees page — tuition/library/lab/transport line items,
 * payment history, and a "pay now" flow (stubbed until config.js's
 * API.baseUrl points at a real payment backend).
 *
 * Consumes: constants.js (FEE_CATEGORIES, PAYMENT_STATUS), storage.js,
 * formatter.js (currency), helpers.js (qs/qsa/delegate/sumBy), modal.js.
 */

document.addEventListener('DOMContentLoaded', initFeesPage);

function initFeesPage() {
    ensurePaymentConfirmModalExists();
    renderFeeSummary();
    renderFeeBreakdown();
    renderPaymentHistory();
    wireSearch();
}

/* ---------------------------------------------------------------- */
/* Data                                                               */
/* ---------------------------------------------------------------- */

function getFeeItems() {
    // Each item: { id, category (a FEE_CATEGORIES key), label, amount, status (PAYMENT_STATUS) }
    return getFromStorage(CONFIG.STORAGE_KEYS.fees) || [];
}

function getPaymentHistory() {
    // Each record: { id, date, amount, method, feeItemId }
    return getFromStorage(CONFIG.STORAGE_KEYS.paymentHistory) || [];
}

function savePaymentHistory(history) {
    saveToStorage(CONFIG.STORAGE_KEYS.paymentHistory, history);
}

function saveFeeItems(items) {
    saveToStorage(CONFIG.STORAGE_KEYS.fees, items);
}

/* ---------------------------------------------------------------- */
/* Summary cards                                                      */
/* ---------------------------------------------------------------- */

function renderFeeSummary() {
    const items = getFeeItems();

    // sumBy from helpers.js — this is the exact "total fee amount across
    // line items" use case it was documented for.
    const totalDue = sumBy(
        items.filter((i) => i.status !== PAYMENT_STATUS.PAID),
        (i) => i.amount
    );
    const totalPaid = sumBy(
        items.filter((i) => i.status === PAYMENT_STATUS.PAID),
        (i) => i.amount
    );

    const dueEl = qs('#feesTotalDue .card-value');
    const paidEl = qs('#feesTotalPaid .card-value');
    if (dueEl) dueEl.textContent = formatCurrency(totalDue);
    if (paidEl) paidEl.textContent = formatCurrency(totalPaid);
}

/* ---------------------------------------------------------------- */
/* Breakdown by category                                              */
/* ---------------------------------------------------------------- */

function renderFeeBreakdown() {
    const container = qs('#feeBreakdownList');
    if (!container) return;

    const items = getFeeItems();

    if (items.length === 0) {
        container.innerHTML = `<p class="empty-state">${UI_TEXT.emptyState}</p>`;
        return;
    }

    // Grouped by category so each section maps 1:1 to the CSS fill classes
    // (tuition-fill / library-fill / lab-fill / transport-fill) noted when
    // FEE_CATEGORIES was defined in constants.js.
    const grouped = groupBy(items, (i) => i.category);

    container.innerHTML = Object.entries(grouped)
        .map(([category, categoryItems]) => {
            const label = FEE_CATEGORIES[category] || category;
            const subtotal = sumBy(categoryItems, (i) => i.amount);
            return `
        <section class="fee-category ${category}-fill" data-category="${category}">
          <h3 class="fee-category-title">${label}<span class="fee-category-subtotal">${formatCurrency(subtotal)}</span></h3>
          <ul class="fee-item-list">
            ${categoryItems.map(renderFeeItemRow).join('')}
          </ul>
        </section>
      `;
        })
        .join('');
}

function renderFeeItemRow(item) {
    const isPaid = item.status === PAYMENT_STATUS.PAID;
    return `
    <li class="fee-item payment-status-${item.status}" data-id="${item.id}">
      <span class="fee-item-label">${item.label}</span>
      <span class="fee-item-amount">${formatCurrency(item.amount)}</span>
      <span class="payment-status status-${item.status}">${item.status}</span>
      ${
        isPaid
          ? ''
          : `<button type="button" class="btn-pay" data-modal-open="payFeeModal" data-fee-id="${item.id}">Pay now</button>`
      }
    </li>
  `;
}

/* ---------------------------------------------------------------- */
/* Payment history                                                    */
/* ---------------------------------------------------------------- */

function renderPaymentHistory() {
  const container = qs('#paymentHistoryList');
  if (!container) return;

  const history = getPaymentHistory()
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  if (history.length === 0) {
    container.innerHTML = `<p class="empty-state">${UI_TEXT.emptyState}</p>`;
    return;
  }

  container.innerHTML = history
    .map(
      (h) => `
      <li class="payment-history-item">
        <span class="payment-date">${formatDate(h.date)}</span>
        <span class="payment-amount">${formatCurrency(h.amount)}</span>
        <span class="payment-method">${h.method}</span>
      </li>
    `
    )
    .join('');
}

/* ---------------------------------------------------------------- */
/* Pay now modal                                                      */
/* ---------------------------------------------------------------- */

function ensurePaymentConfirmModalExists() {
  createModal({
    id: 'payFeeModal',
    title: 'Confirm payment',
    bodyHTML: `
      <p id="payFeeSummary"></p>
      <input type="hidden" id="payFeeId" />
      <label for="payFeeMethod">Payment method</label>
      <select id="payFeeMethod">
        <option value="card">Card</option>
        <option value="bank_transfer">Bank transfer</option>
        <option value="cash">Cash</option>
      </select>
    `,
    footerHTML: `
      <button type="button" data-modal-close>Cancel</button>
      <button type="button" id="confirmPayBtn">Confirm payment</button>
    `,
  });

  qs('#confirmPayBtn')?.addEventListener('click', handleConfirmPayment);

  const feesGrid = qs('#feeBreakdownList');
  if (feesGrid) {
    delegate(feesGrid, 'click', '.btn-pay', (e, btn) => {
      prefillPayModal(btn.dataset.feeId);
    });
  }
}

function prefillPayModal(feeId) {
  const item = getFeeItems().find((i) => String(i.id) === String(feeId));
  if (!item) return;

  qs('#payFeeId').value = item.id;
  qs('#payFeeSummary').textContent = `${item.label} — ${formatCurrency(item.amount)}`;
}

function handleConfirmPayment() {
  const feeId = qs('#payFeeId').value;
  const method = qs('#payFeeMethod').value;
  const items = getFeeItems();
  const item = items.find((i) => String(i.id) === String(feeId));
  if (!item) return;

  // Stub: marks the item paid and logs a history record locally.
  // Swap this block for a real payment gateway call once config.js's
  // API.baseUrl is set — nothing else on the page needs to change.
  item.status = PAYMENT_STATUS.PAID;
  saveFeeItems(items);

  const history = getPaymentHistory();
  history.push({
    id: generateId(),
    date: new Date().toISOString(),
    amount: item.amount,
    method,
    feeItemId: item.id,
  });
  savePaymentHistory(history);

  closeModal('payFeeModal');
  renderFeeSummary();
  renderFeeBreakdown();
  renderPaymentHistory();
}

/* ---------------------------------------------------------------- */
/* Global search (navbar) integration                                 */
/* ---------------------------------------------------------------- */

function wireSearch() {
  document.addEventListener('cq:search', (e) => {
    const query = (e.detail.query || '').trim().toLowerCase();
    qsa('#feeBreakdownList .fee-item').forEach((item) => {
      const labelEl = item.querySelector('.fee-item-label');
      const text = labelEl ? labelEl.textContent.toLowerCase() : '';
      const matches = query === '' || text.includes(query);
      item.classList.toggle('search-hidden', !matches);
    });
  });
}