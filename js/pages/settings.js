/**
 * settings.js
 * Page script for the Settings page — profile info, theme preference,
 * and change-password form.
 *
 * Consumes: constants.js (UI_TEXT), storage.js (getTheme/setTheme,
 * same functions navbar.js's theme toggle already uses), formatter.js,
 * validators.js (isStrongPassword, passwordsMatch, composeValidators —
 * the exact functions documented as "for settings.js's eventual
 * change-password form"), helpers.js (qs/qsa), modal.js (confirm dialog
 * for destructive actions).
 */

document.addEventListener('DOMContentLoaded', initSettingsPage);

function initSettingsPage() {
    ensureConfirmModalExists();
    renderProfileForm();
    renderThemePreference();
    wireProfileForm();
    wirePasswordForm();
    wireThemeControls();
}

/* ---------------------------------------------------------------- */
/* Profile info                                                       */
/* ---------------------------------------------------------------- */

function getProfile() {
    return getItem(CONFIG.STORAGE_KEYS.userProfile) || {
        name: '',
        email: '',
        phone: '',
    };
}

function saveProfile(profile) {
    setItem(CONFIG.STORAGE_KEYS.userProfile, profile);
}

function renderProfileForm() {
    const profile = getProfile();
    const nameEl = qs('#profileName');
    const emailEl = qs('#profileEmail');
    const phoneEl = qs('#profilePhone');

    if (nameEl) nameEl.value = profile.name;
    if (emailEl) emailEl.value = profile.email;
    if (phoneEl) phoneEl.value = profile.phone;
}

function wireProfileForm() {
    const saveBtn = qs('#saveProfileBtn');
    if (!saveBtn) return;

    saveBtn.addEventListener('click', () => {
        const name = qs('#profileName').value.trim();
        const email = qs('#profileEmail').value.trim();
        const phone = qs('#profilePhone').value.trim();

        clearFieldErrors('#profileForm');

        const nameCheck = isRequired(name, 'Name');
        const emailCheck = composeValidators([
            () => isRequired(email, 'Email'),
            () => isEmail(email),
        ]);
        const phoneCheck = phone ? isPhone(phone) : { valid: true };

        let hasError = false;
        if (!nameCheck.valid) {
            setFieldError('profileName', nameCheck.message);
            hasError = true;
        }
        if (!emailCheck.valid) {
            setFieldError('profileEmail', emailCheck.message);
            hasError = true;
        }
        if (!phoneCheck.valid) {
            setFieldError('profilePhone', phoneCheck.message);
            hasError = true;
        }
        if (hasError) return;

        saveProfile({ name, email, phone });
        showFormStatus('#profileFormStatus', 'Profile updated.');
        if (typeof showToast === 'function') showToast('Profile updated.', 'success');
    });
}

/* ---------------------------------------------------------------- */
/* Theme preference                                                    */
/* ---------------------------------------------------------------- */

function renderThemePreference() {
    // Reads the same getTheme() storage.js function navbar.js's toggle
    // already writes to, so Settings and the navbar icon never disagree.
    const currentTheme = getTheme();
    const radios = qsa('input[name="themePreference"]');
    radios.forEach((radio) => {
        radio.checked = radio.value === currentTheme;
    });
}

function wireThemeControls() {
    const radios = qsa('input[name="themePreference"]');
    radios.forEach((radio) => {
        radio.addEventListener('change', (e) => {
            if (!e.target.checked) return;
            setTheme(e.target.value);
            document.documentElement.setAttribute(CONFIG.THEME.attribute, e.target.value);
        });
    });
}

/* ---------------------------------------------------------------- */
/* Change password                                                     */
/* ---------------------------------------------------------------- */

function wirePasswordForm() {
    const saveBtn = qs('#changePasswordBtn');
    if (!saveBtn) return;

    saveBtn.addEventListener('click', () => {
        const currentPassword = qs('#currentPassword').value;
        const newPassword = qs('#newPassword').value;
        const confirmPassword = qs('#confirmPassword').value;

        clearFieldErrors('#passwordForm');

        const currentCheck = isRequired(currentPassword, 'Current password');
        const newCheck = composeValidators([
            () => isRequired(newPassword, 'New password'),
            () => isStrongPassword(newPassword),
        ]);
        const matchCheck = passwordsMatch(newPassword, confirmPassword);

        let hasError = false;
        if (!currentCheck.valid) {
            setFieldError('currentPassword', currentCheck.message);
            hasError = true;
        }
        if (!newCheck.valid) {
            setFieldError('newPassword', newCheck.message);
            hasError = true;
        }
        if (!matchCheck.valid) {
            setFieldError('confirmPassword', matchCheck.message);
            hasError = true;
        }
        if (hasError) return;

        // Actual current-password verification needs a real backend —
        // config.js's API.baseUrl is still empty, so this just confirms
        // via modal and clears the form, matching the "stub until API
        // exists" pattern used in fees.js's pay-now flow.
        openModal('confirmPasswordChangeModal');
    });
}

function ensureConfirmModalExists() {
    createModal({
        id: 'confirmPasswordChangeModal',
        title: 'Change password?',
        bodyHTML: `<p>You'll need to sign in again after this change.</p>`,
        footerHTML: `
      <button type="button" data-modal-close>Cancel</button>
      <button type="button" id="confirmPasswordChangeBtn">Confirm</button>
    `,
    });

    qs('#confirmPasswordChangeBtn')?.addEventListener('click', () => {
        qs('#currentPassword').value = '';
        qs('#newPassword').value = '';
        qs('#confirmPassword').value = '';
        closeModal('confirmPasswordChangeModal');
        showFormStatus('#passwordFormStatus', 'Password updated.');
        if (typeof showToast === 'function') showToast('Password updated.', 'success');
    });     
}

/* ---------------------------------------------------------------- */
/* Shared form helpers                                                 */
/* ---------------------------------------------------------------- */

function clearFieldErrors(formSelector) {
    const scope = formSelector ? qs(formSelector) : document;
    if (!scope) return;
    Array.from(scope.querySelectorAll('.field-error')).forEach((el) => (el.textContent = ''));
}

function setFieldError(fieldId, message) {
    const errorEl = qs(`[data-error-for="${fieldId}"]`);
    if (errorEl) errorEl.textContent = message;
}

function showFormStatus(selector, message) {
    const el = qs(selector);
    if (!el) return;
    el.textContent = message;
    el.classList.add('visible');
    setTimeout(() => el.classList.remove('visible'), 3000);
}