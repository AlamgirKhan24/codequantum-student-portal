/**
 * modal.js
 * Reusable modal component: programmatic open/close API, focus trapping,
 * Escape-to-close, click-outside-to-close, and a dynamic creation helper
 * for modals that don't exist as static HTML yet.
 *
 * Depends on: helpers.js (qs, qsa)
 * Convention: dispatches cq:modal-open / cq:modal-close custom events so
 * page scripts can react (e.g. pause a video, refresh data) without
 * modal.js knowing anything about page-specific content.
 */

const OPEN_CLASS = 'modal-open';
const BODY_LOCK_CLASS = 'modal-body-lock';
const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Track currently open modals so Escape closes the topmost one only,
// and so we can restore focus to whatever triggered the modal.
const openStack = [];

/**
 * Wires up all modals already present in the DOM (elements with
 * [data-modal] or .modal) plus any [data-modal-open]/[data-modal-close]
 * trigger buttons. Call once per page after DOMContentLoaded.
 */
function initModals() {
    document.addEventListener('click', handleTriggerClick);
    document.addEventListener('keydown', handleKeydown);
}

function handleTriggerClick(e) {
    const openTrigger = e.target.closest('[data-modal-open]');
    if (openTrigger) {
        const id = openTrigger.getAttribute('data-modal-open');
        openModal(id, { trigger: openTrigger });
        return;
    }

    const closeTrigger = e.target.closest('[data-modal-close]');
    if (closeTrigger) {
        const modalEl = closeTrigger.closest('.modal');
        if (modalEl) closeModal(modalEl.id);
        return;
    }

    // Click-outside-to-close: only if the click landed on the backdrop
    // itself (the .modal container), not on .modal-dialog content.
    if (e.target.classList && e.target.classList.contains('modal') && e.target.classList.contains(OPEN_CLASS)) {
        closeModal(e.target.id);
    }
}

function handleKeydown(e) {
    if (e.key !== 'Escape' || openStack.length === 0) return;
    const topId = openStack[openStack.length - 1];
    closeModal(topId);
}

/**
 * Opens a modal by id. If the element doesn't exist in the DOM,
 * this is a no-op (use createModal() to build one dynamically first).
 */
function openModal(id, { trigger } = {}) {
    const modalEl = document.getElementById(id);
    if (!modalEl) {
        console.warn(`modal.js: no element found with id "${id}"`);
        return;
    }

    modalEl.classList.add(OPEN_CLASS);
    modalEl.setAttribute('aria-hidden', 'false');
    document.body.classList.add(BODY_LOCK_CLASS);

    openStack.push(id);
    modalEl.dataset.returnFocusTo = trigger ? '' : '';
    modalEl._returnFocusEl = trigger || document.activeElement;

    trapFocus(modalEl);

    document.dispatchEvent(
        new CustomEvent('cq:modal-open', { detail: { id, modalEl } })
    );
}

/**
 * Closes a modal by id, restores focus to whatever opened it,
 * and unlocks body scroll once no modals remain open.
 */
function closeModal(id) {
    const modalEl = document.getElementById(id);
    if (!modalEl) return;

    modalEl.classList.remove(OPEN_CLASS);
    modalEl.setAttribute('aria-hidden', 'true');
    releaseFocus(modalEl);

    const idx = openStack.indexOf(id);
    if (idx !== -1) openStack.splice(idx, 1);

    if (openStack.length === 0) {
        document.body.classList.remove(BODY_LOCK_CLASS);
    }

    document.dispatchEvent(
        new CustomEvent('cq:modal-close', { detail: { id, modalEl } })
    );
}

function closeAllModals() {
    // Copy the array since closeModal mutates openStack while iterating.
    [...openStack].forEach(closeModal);
}

/**
 * Traps Tab/Shift+Tab focus inside the modal and focuses the first
 * focusable element (or the dialog itself if nothing is focusable).
 */
function trapFocus(modalEl) {
    const focusable = Array.from(modalEl.querySelectorAll(FOCUSABLE_SELECTOR));
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    (first || modalEl).focus();

    function onTab(e) {
        if (e.key !== 'Tab' || focusable.length === 0) return;

        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }

    modalEl.addEventListener('keydown', onTab);
    modalEl._trapFocusHandler = onTab;
}

function releaseFocus(modalEl) {
    if (modalEl._trapFocusHandler) {
        modalEl.removeEventListener('keydown', modalEl._trapFocusHandler);
        delete modalEl._trapFocusHandler;
    }
    if (modalEl._returnFocusEl && typeof modalEl._returnFocusEl.focus === 'function') {
        modalEl._returnFocusEl.focus();
    }
    delete modalEl._returnFocusEl;
}

/**
 * Builds a modal's DOM from scratch and appends it to <body>, for cases
 * where no static markup exists yet (e.g. a confirm dialog).
 * Returns the created element; does not open it automatically.
 *
 * createModal({
 *   id: 'confirmDelete',
 *   title: 'Delete assignment?',
 *   bodyHTML: '<p>This can't be undone.</p>',
 *   footerHTML: '<button data-modal-close>Cancel</button><button id="confirmBtn">Delete</button>'
 * });
 */
function createModal({ id, title = '', bodyHTML = '', footerHTML = '' }) {
    if (!id) {
        console.warn('modal.js: createModal requires an id');
        return null;
    }
    if (document.getElementById(id)) {
        return document.getElementById(id);
    }

    const modalEl = document.createElement('div');
    modalEl.className = 'modal';
    modalEl.id = id;
    modalEl.setAttribute('role', 'dialog');
    modalEl.setAttribute('aria-modal', 'true');
    modalEl.setAttribute('aria-hidden', 'true');
    if (title) modalEl.setAttribute('aria-label', title);
    modalEl.tabIndex = -1;

    modalEl.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-header">
        <h2 class="modal-title">${title}</h2>
        <button type="button" class="modal-close-btn" data-modal-close aria-label="Close">&times;</button>
      </div>
      <div class="modal-body">${bodyHTML}</div>
      ${footerHTML ? `<div class="modal-footer">${footerHTML}</div>` : ''}
    </div>
  `;
 
  document.body.appendChild(modalEl);
  return modalEl;
}
 
/**
 * Removes a dynamically-created modal from the DOM entirely.
 * (For static HTML modals, prefer closeModal() and leave them in place.)
 */
function destroyModal(id) {
  const modalEl = document.getElementById(id);
  if (!modalEl) return;
  closeModal(id);
  modalEl.remove();
}