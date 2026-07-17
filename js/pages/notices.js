/**
 * notices.js
 * Page script for the Notices page — renders the notice feed, supports
 * category filtering, and lets the student mark notices as read. Read
 * state is persisted under CONFIG.STORAGE_KEYS.notificationsSeen so it
 * survives reloads (until a real backend replaces the mock feed).
 *
 * Consumes: helpers.js (qs/qsa), storage.js (getItem/setItem),
 * config.js (STORAGE_KEYS).
 */

const NOTICES = [
    {
        id: 'n-1',
        category: 'academic',
        title: 'Midterm exam schedule published',
        body: 'The JavaScript and React midterm timetable is now live. Check the Timetable page for your slots.',
        date: 'Jul 15, 2026',
        pinned: true,
    },
    {
        id: 'n-2',
        category: 'events',
        title: 'CodeQuantum Hackathon — registrations open',
        body: 'Team up and build in 48 hours. Registration closes Jul 25. Prizes for the top three projects.',
        date: 'Jul 14, 2026',
        pinned: false,
    },
    {
        id: 'n-3',
        category: 'fees',
        title: 'Installment 3 due Aug 15',
        body: 'A balance of $1,200 remains for this semester. Pay before the due date to avoid a late fee.',
        date: 'Jul 12, 2026',
        pinned: false,
    },
    {
        id: 'n-4',
        category: 'academic',
        title: 'New elective: TypeScript Fundamentals',
        body: 'Enrollment for the TypeScript elective opens next week. Seats are limited to 40 students.',
        date: 'Jul 10, 2026',
        pinned: false,
    },
    {
        id: 'n-5',
        category: 'events',
        title: 'Guest lecture: Scaling frontend teams',
        body: 'A senior engineer from a partner company joins us Jul 20 at 3:00 PM in the main hall.',
        date: 'Jul 08, 2026',
        pinned: false,
    },
    {
        id: 'n-6',
        category: 'general',
        title: 'Portal maintenance window',
        body: 'The portal will be briefly unavailable Jul 18, 1:00–2:00 AM for scheduled maintenance.',
        date: 'Jul 06, 2026',
        pinned: false,
    },
];

const CATEGORY_META = {
    academic: { label: 'Academic', icon: 'fa-graduation-cap' },
    events: { label: 'Events', icon: 'fa-calendar-star' },
    fees: { label: 'Fees', icon: 'fa-wallet' },
    general: { label: 'General', icon: 'fa-circle-info' },
};

let activeFilter = 'all';

document.addEventListener('DOMContentLoaded', initNoticesPage);

function initNoticesPage() {
    renderNotices();
    wireFilters();
    wireMarkAllRead();
    updateUnreadCount();
}

function getReadIds() {
    return getItem(CONFIG.STORAGE_KEYS.notificationsSeen) || [];
}

function setReadIds(ids) {
    setItem(CONFIG.STORAGE_KEYS.notificationsSeen, ids);
}

function isRead(id) {
    return getReadIds().includes(id);
}

function markRead(id) {
    const ids = getReadIds();
    if (!ids.includes(id)) {
        ids.push(id);
        setReadIds(ids);
    }
}

function visibleNotices() {
    const list = activeFilter === 'all'
        ? NOTICES
        : NOTICES.filter((n) => n.category === activeFilter);
    // Pinned first, otherwise keep source (newest-first) order.
    return [...list].sort((a, b) => Number(b.pinned) - Number(a.pinned));
}

function renderNotices() {
    const feed = qs('#noticesFeed');
    if (!feed) return;

    const items = visibleNotices();

    if (items.length === 0) {
        feed.innerHTML = `
            <div class="notices-empty">
                <i class="fa-regular fa-bell-slash"></i>
                <h3>No notices here</h3>
                <p>There's nothing in this category right now. Check back later.</p>
            </div>`;
        return;
    }

    feed.innerHTML = items.map(noticeCardHTML).join('');

    qsa('.notice-card').forEach((card) => {
        card.addEventListener('click', () => {
            const id = card.dataset.id;
            markRead(id);
            card.classList.remove('unread');
            updateUnreadCount();
        });
    });
}

function noticeCardHTML(notice) {
    const meta = CATEGORY_META[notice.category] || CATEGORY_META.general;
    const unread = isRead(notice.id) ? '' : ' unread';
    const pinned = notice.pinned
        ? '<span class="notice-pin"><i class="fa-solid fa-thumbtack"></i> Pinned</span>'
        : '';

    return `
        <article class="notice-card${unread}" data-id="${notice.id}" data-category="${notice.category}">
            <div class="notice-icon ${notice.category}">
                <i class="fa-solid ${meta.icon}"></i>
            </div>
            <div class="notice-body">
                <div class="notice-top">
                    <h3>${notice.title}</h3>
                    ${pinned}
                </div>
                <p>${notice.body}</p>
                <div class="notice-foot">
                    <span class="notice-tag ${notice.category}">${meta.label}</span>
                    <span class="notice-date"><i class="fa-regular fa-clock"></i> ${notice.date}</span>
                </div>
            </div>
            <span class="notice-dot" aria-hidden="true"></span>
        </article>`;
}

function wireFilters() {
    qsa('.notices-filter').forEach((btn) => {
        btn.addEventListener('click', () => {
            qsa('.notices-filter').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            activeFilter = btn.dataset.filter;
            renderNotices();
        });
    });
}

function wireMarkAllRead() {
    const btn = qs('#markAllReadBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
        setReadIds(NOTICES.map((n) => n.id));
        qsa('.notice-card').forEach((c) => c.classList.remove('unread'));
        updateUnreadCount();
    });
}

function updateUnreadCount() {
    const unread = NOTICES.filter((n) => !isRead(n.id)).length;
    const el = qs('#unreadCount');
    if (el) el.textContent = unread;

    const badge = qs('#noticesUnreadBadge');
    if (badge) {
        badge.textContent = unread;
        badge.style.display = unread > 0 ? '' : 'none';
    }
}
