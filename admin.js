(() => {
    const WORKER = 'https://commissions.aishuhariharan123.workers.dev';

    const STATUS_LABELS = {
        not_started:       'Not Started',
        sketching:         'Sketching',
        lining:            'Lining',
        coloring:          'Coloring / Rendering',
        awaiting_approval: 'Awaiting Approval',
        delivered:         'Delivered',
    };

    const STATUS_ICONS = {
        not_started:       'fa-clock',
        sketching:         'fa-pencil',
        lining:            'fa-pen-nib',
        coloring:          'fa-palette',
        awaiting_approval: 'fa-eye',
        delivered:         'fa-box',
    };

    const loginScreen  = document.getElementById('login-screen');
    const adminContent = document.getElementById('admin-content');
    const loginBtn     = document.getElementById('google-login-btn');
    const logoutBtn    = document.getElementById('logout-btn');

    let token = sessionStorage.getItem('admin_token');

    async function verifyToken(t) {
        try {
            const r = await fetch(`${WORKER}/admin/verify`, {
                headers: { 'Authorization': `Bearer ${t}` }
            });
            return r.ok;
        } catch { return false; }
    }

    async function init() {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        if (code) {
            history.replaceState({}, '', '/admin.html'); 
            const r = await fetch(`${WORKER}/admin/auth`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, redirect_uri: `${location.origin}/admin.html` })
            });
            if (r.ok) {
                const d = await r.json();
                token = d.token;
                sessionStorage.setItem('admin_token', token);
            } else {
                showLogin('login failed — please try again.');
                return;
            }
        }

        if (token && await verifyToken(token)) {
            showAdmin();
        } else {
            sessionStorage.removeItem('admin_token');
            showLogin();
        }
    }

    function showLogin(msg) {
        loginScreen.style.display = 'flex';
        adminContent.classList.remove('visible');
        if (msg) {
            const p = loginScreen.querySelector('p');
            p.textContent = msg;
        }
    }

    function showAdmin() {
        loginScreen.style.display = 'none';
        adminContent.classList.add('visible');
        loadSlots();
        loadCommissions();
    }

    loginBtn.addEventListener('click', async () => {
        const r = await fetch(`${WORKER}/admin/auth-url`);
        const d = await r.json();
        window.location.href = d.url;
    });

    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('admin_token');
        token = null;
        showLogin();
    });

    const slotsDisplay = document.getElementById('slots-display');
    const slotsInput   = document.getElementById('slots-input');
    const slotsMsg     = document.getElementById('slots-msg');

    async function loadSlots() {
        const r = await fetch(`${WORKER}/slots`);
        const d = await r.json();
        slotsDisplay.textContent = d.slots;
        slotsInput.value = d.slots;
    }

    document.getElementById('slots-inc').addEventListener('click', () => {
        slotsInput.value = Math.min(10, parseInt(slotsInput.value || 0) + 1);
    });

    document.getElementById('slots-dec').addEventListener('click', () => {
        slotsInput.value = Math.max(0, parseInt(slotsInput.value || 0) - 1);
    });

    document.getElementById('slots-save').addEventListener('click', async () => {
        const slots = parseInt(slotsInput.value);
        if (isNaN(slots) || slots < 0) return;
        const r = await fetch(`${WORKER}/admin/set-slots`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ slots })
        });
        if (r.ok) {
            slotsDisplay.textContent = slots;
            slotsMsg.textContent = '✓ saved!';
            setTimeout(() => slotsMsg.textContent = '', 2000);
        }
    });

    const adminQueue = document.getElementById('admin-queue');

    async function loadCommissions() {
        const r = await fetch(`${WORKER}/admin/commissions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const d = await r.json();
        renderCommissions(d.commissions || []);
    }

    function renderCommissions(commissions) {
        const active = commissions.filter(c => c.status !== 'delivered');
        if (active.length === 0) {
            adminQueue.innerHTML = `<p class="empty-msg">no active commissions right now!</p>`;
            return;
        }
        adminQueue.innerHTML = active.map(c => renderCard(c)).join('');

        adminQueue.querySelectorAll('.status-select').forEach(sel => {
            sel.addEventListener('change', async () => {
                const id  = sel.dataset.id;
                const msg = sel.closest('.admin-card').querySelector('.save-msg');
                const r = await fetch(`${WORKER}/admin/update-status`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ id, status: sel.value })
                });
                if (r.ok) {
                    const badge = sel.closest('.status-row').querySelector('.badge');
                    badge.className = `badge badge-${sel.value}`;
                    badge.innerHTML = `<i class="fa-solid ${STATUS_ICONS[sel.value]}"></i> ${STATUS_LABELS[sel.value]}`;
                    msg.textContent = '✓ saved!';
                    setTimeout(() => {
                        msg.textContent = '';
                        if (sel.value === 'delivered') {
                            const card = sel.closest('.admin-card');
                            card.style.opacity = '0.4';
                            card.style.transition = 'opacity 0.4s';
                            setTimeout(() => { loadSlots(); loadCommissions(); }, 1200);
                        }
                    }, 1500);
                } else {
                    msg.textContent = '✗ failed to save';
                }
            });
        });
    }

    function renderCard(c) {
        const icon  = STATUS_ICONS[c.status] ?? 'fa-circle';
        const label = STATUS_LABELS[c.status] ?? c.status;
        const animTag = c.animated ? ' (animated)' : '';
        const payLabel = c.paymentMethod === 'paypal' ? 'PayPal email'
                       : c.paymentMethod === 'cashapp' ? 'CashApp'
                       : 'Venmo';

        const options = Object.entries(STATUS_LABELS).map(([val, lbl]) =>
            `<option value="${val}" ${c.status === val ? 'selected' : ''}>${lbl}</option>`
        ).join('');

        return `
            <div class="admin-card">
                <div class="admin-card-header">
                    <div class="admin-card-title">
                        ${c.characterName}
                        <span>${c.commissionType}${animTag} · submitted ${new Date(c.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                </div>
                <div class="admin-card-meta">
                    <div class="meta-row"><span class="meta-label">Reference:</span> <a href="${c.referenceLink}" target="_blank">${c.referenceLink}</a></div>
                    <div class="meta-row"><span class="meta-label">${payLabel}:</span> ${c.paymentInfo}</div>
                    <div class="meta-row"><span class="meta-label">Contact:</span> ${c.contactMethod} — ${c.contactHandle}</div>
                    <div class="meta-row"><span class="meta-label">Background:</span> ${c.background || 'n/a'}</div>
                    ${c.notes ? `<div class="meta-row"><span class="meta-label">Notes:</span> ${c.notes}</div>` : ''}
                </div>
                <div class="status-row">
                    <span class="badge badge-${c.status}"><i class="fa-solid ${icon}"></i> ${label}</span>
                    <select class="status-select" data-id="${c.id}">${options}</select>
                    <span class="save-msg"></span>
                </div>
            </div>
        `;
    }

    init();
})();