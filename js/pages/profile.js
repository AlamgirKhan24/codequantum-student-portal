/**
 * pages/profile.js
 * Progressive enhancement for the (static) Profile page. The card markup
 * is authored in profile.html; this script overlays any values the user
 * saved on the Settings page (cq_user_profile) so the two stay in sync,
 * and wires the action buttons with toast feedback.
 */

document.addEventListener('DOMContentLoaded', initProfilePage);

function initProfilePage() {
    hydrateProfileCard();
    wireProfileButtons();
}

function hydrateProfileCard() {
    const profile = getUserProfile();
    if (!profile) return;

    if (profile.name) {
        const nameEl = qs('.profile-card-name');
        if (nameEl) nameEl.textContent = profile.name;
        setAvatarInitials(profile.name);
    }

    if (profile.email) {
        const emailEl = qs('.profile-card-info li i.fa-envelope + span');
        if (emailEl) emailEl.textContent = profile.email;
    }

    if (profile.phone) {
        const phoneEl = qs('.profile-card-info li i.fa-phone + span');
        if (phoneEl) phoneEl.textContent = profile.phone;
    }
}

function setAvatarInitials(name) {
    const avatar = qs('.profile-card-avatar');
    if (!avatar) return;
    const initials = name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');
    if (initials) avatar.textContent = initials;
}

function wireProfileButtons() {
    // Share profile → copy a link to the clipboard where supported.
    const shareBtn = qs('.profile-card-cta');
    if (shareBtn) {
        shareBtn.addEventListener('click', async () => {
            const url = window.location.href;
            try {
                if (navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(url);
                    notify('Profile link copied to clipboard.', 'success');
                    return;
                }
            } catch (err) {
                console.warn('[profile] clipboard write failed:', err);
            }
            notify('Sharing is not available in this browser.', 'warning');
        });
    }

    // Edit personal info → point users to Settings, the single source of truth.
    const editBtn = qs('.edit-btn');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            notify('Edit your details on the Settings page.', 'info');
            setTimeout(() => {
                window.location.href = 'settings.html';
            }, 900);
        });
    }

    const avatarBtn = qs('.avatar-edit-btn');
    if (avatarBtn) {
        avatarBtn.addEventListener('click', () => {
            notify('Photo uploads are coming soon.', 'info');
        });
    }
}

function notify(message, type) {
    if (typeof showToast === 'function') showToast(message, type);
}
