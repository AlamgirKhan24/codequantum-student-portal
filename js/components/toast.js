/**
 * components/toast.js
 * Lightweight, dependency-free toast/snackbar. Exposes a global
 * showToast(message, type, options) that any page or component can call
 * to give the user quick, non-blocking feedback after an action.
 *
 *   showToast('Payment received', 'success');
 *   showToast('Could not save changes', 'error');
 *   showToast('Statement downloaded', 'info', { duration: 5000 });
 *
 * A single container is created lazily on first use and reused after,
 * so pages don't need any markup — just call the function.
 */

const TOAST_TYPES = {
    success: { icon: 'fa-circle-check' },
    error: { icon: 'fa-circle-exclamation' },
    warning: { icon: 'fa-triangle-exclamation' },
    info: { icon: 'fa-circle-info' },
};

let toastContainerEl = null;

function ensureToastContainer() {
    if (toastContainerEl && document.body.contains(toastContainerEl)) {
        return toastContainerEl;
    }
    toastContainerEl = document.createElement('div');
    toastContainerEl.className = 'toast-container';
    toastContainerEl.setAttribute('role', 'region');
    toastContainerEl.setAttribute('aria-label', 'Notifications');
    document.body.appendChild(toastContainerEl);
    return toastContainerEl;
}

/**
 * Show a toast.
 * @param {string} message - text to display
 * @param {'success'|'error'|'warning'|'info'} [type='info']
 * @param {{ duration?: number }} [options]
 */
function showToast(message, type = 'info', options = {}) {
    const meta = TOAST_TYPES[type] || TOAST_TYPES.info;
    const duration = typeof options.duration === 'number' ? options.duration : 3500;
    const container = ensureToastContainer();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.innerHTML = `
        <i class="toast-icon fa-solid ${meta.icon}" aria-hidden="true"></i>
        <span class="toast-message"></span>
        <button type="button" class="toast-close" aria-label="Dismiss">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>`;
    // Assign text via textContent so message can't inject markup.
    toast.querySelector('.toast-message').textContent = message;

    const remove = () => {
        toast.classList.remove('visible');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
        // Fallback in case transitionend doesn't fire (e.g. reduced motion).
        setTimeout(() => toast.remove(), 400);
    };

    toast.querySelector('.toast-close').addEventListener('click', remove);
    container.appendChild(toast);

    // Force reflow so the entrance transition runs.
    void toast.offsetWidth;
    toast.classList.add('visible');

    if (duration > 0) {
        setTimeout(remove, duration);
    }

    return toast;
}
