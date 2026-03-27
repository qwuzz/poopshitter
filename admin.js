(() => {
    const COMM_WORKER   = 'https://commissions.aishuhariharan123.workers.dev';
    const FANART_WORKER = 'https://fanart.aishuhariharan123.workers.dev';

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

    // authentication
    const loginScreen  = document.getElementById('login-screen');
    const adminContent = document.getElementById('admin-content');
    const loginBtn     = document.getElementById('google-login-btn');
    const logoutBtn    = document.getElementById('logout-btn');

    let commToken   = sessionStorage.getItem('admin_token_comm');
    let fanartToken = sessionStorage.getItem('admin_token_fanart');

    async function verifyToken(worker, token) {
        try {
            const r = await fetch(`${worker}/admin/verify`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return r.ok;
        } catch { return false; }
    }

    async function init() {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');

        if (code) {
            history.replaceState({}, '', '/admin.html');
            const redirect = `${location.origin}/admin.html`;

            const [commRes, fanartRes] = await Promise.all([
                fetch(`${COMM_WORKER}/admin/auth`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code, redirect_uri: redirect })
                }),
                fetch(`${FANART_WORKER}/admin/auth`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code, redirect_uri: redirect })
                }),
            ]);

            if (commRes.ok) {
                const d = await commRes.json();
                commToken = d.token;
                sessionStorage.setItem('admin_token_comm', commToken);
            }
            if (fanartRes.ok) {
                const d = await fanartRes.json();
                fanartToken = d.token;
                sessionStorage.setItem('admin_token_fanart', fanartToken);
            }

            if (!commToken && !fanartToken) {
                showLogin('login failed — please try again.');
                return;
            }
        }

        const [commValid, fanartValid] = await Promise.all([
            commToken   ? verifyToken(COMM_WORKER,   commToken)   : Promise.resolve(false),
            fanartToken ? verifyToken(FANART_WORKER, fanartToken) : Promise.resolve(false),
        ]);

        if (commValid || fanartValid) {
            showAdmin();
        } else {
            sessionStorage.removeItem('admin_token_comm');
            sessionStorage.removeItem('admin_token_fanart');
            showLogin();
        }
    }

    function showLogin(msg) {
        loginScreen.style.display = 'flex';
        adminContent.classList.remove('visible');
        if (msg) loginScreen.querySelector('p').textContent = msg;
    }

    function showAdmin() {
        loginScreen.style.display = 'none';
        adminContent.classList.add('visible');
        loadSlots();
        loadCommissions();
        loadFanart();
        loadSuggestions();
    }

    loginBtn.addEventListener('click', async () => {
        const r = await fetch(`${COMM_WORKER}/admin/auth-url`);
        const d = await r.json();
        window.location.href = d.url;
    });

    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('admin_token_comm');
        sessionStorage.removeItem('admin_token_fanart');
        commToken = fanartToken = null;
        showLogin();
    });

    // slots
    const slotsDisplay = document.getElementById('slots-display');
    const slotsInput   = document.getElementById('slots-input');
    const slotsMsg     = document.getElementById('slots-msg');

    async function loadSlots() {
        const r = await fetch(`${COMM_WORKER}/slots`);
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
        const r = await fetch(`${COMM_WORKER}/admin/set-slots`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${commToken}`
            },
            body: JSON.stringify({ slots })
        });
        if (r.ok) {
            slotsDisplay.textContent = slots;
            slotsMsg.textContent = '✓ saved!';
            setTimeout(() => slotsMsg.textContent = '', 2000);
        }
    });

    // commissions
    const adminQueue = document.getElementById('admin-queue');

    async function loadCommissions() {
        const r = await fetch(`${COMM_WORKER}/admin/commissions`, {
            headers: { 'Authorization': `Bearer ${commToken}` }
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
        adminQueue.innerHTML = active.map(c => renderCommCard(c)).join('');

        adminQueue.querySelectorAll('.status-select').forEach(sel => {
            sel.addEventListener('change', async () => {
                const id  = sel.dataset.id;
                const msg = sel.closest('.admin-card').querySelector('.save-msg');
                const r = await fetch(`${COMM_WORKER}/admin/update-status`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${commToken}`
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

    function renderCommCard(c) {
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
            </div>`;
    }

    // fanart
    const fanartAdmin = document.getElementById('fanart-admin');

    async function loadFanart() {
        const r = await fetch(`${FANART_WORKER}/admin/fanart`, {
            headers: { 'Authorization': `Bearer ${fanartToken}` }
        });
        const d = await r.json();
        const pending = (d.fanart || []).filter(f => !f.approved);
        if (pending.length === 0) {
            fanartAdmin.innerHTML = `<p class="empty-msg">no pending fanart submissions!</p>`;
            return;
        }
        fanartAdmin.innerHTML = pending.map(f => `
            <div class="admin-card" id="fanart-${f.id.replace(':', '-')}">
                <div class="admin-card-header">
                    <div class="admin-card-title">by ${f.creditName}
                        <span>${new Date(f.submittedAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span>
                    </div>
                </div>
                <img src="${f.imageUrl}" style="max-width:100%;max-height:300px;object-fit:contain;border-radius:5px;border:2px solid white;" alt="fanart"/>
                <div class="admin-card-meta">
                    ${f.websiteLink ? `<div class="meta-row"><span class="meta-label">Website:</span> <a href="${f.websiteLink}" target="_blank">${f.websiteLink}</a></div>` : ''}
                    ${f.message ? `<div class="meta-row"><span class="meta-label">Message:</span> ${f.message}</div>` : ''}
                </div>
                <div class="status-row">
                    <button class="admin-btn" onclick="approveFanart('${f.id}')"><i class="fa-solid fa-check"></i> approve</button>
                    <button class="admin-btn danger" onclick="rejectFanart('${f.id}')"><i class="fa-solid fa-xmark"></i> reject</button>
                    <span class="save-msg" id="fanart-msg-${f.id.replace(':', '-')}"></span>
                </div>
            </div>`).join('');
    }

    window.approveFanart = async (id) => {
        const msg = document.getElementById(`fanart-msg-${id.replace(':', '-')}`);
        const r = await fetch(`${FANART_WORKER}/admin/fanart/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${fanartToken}` },
            body: JSON.stringify({ id })
        });
        if (r.ok) {
            msg.textContent = '✓ approved!';
            setTimeout(() => loadFanart(), 1000);
        } else { msg.textContent = '✗ failed'; }
    };

    window.rejectFanart = async (id) => {
        if (!confirm('reject and delete this submission?')) return;
        const msg = document.getElementById(`fanart-msg-${id.replace(':', '-')}`);
        const r = await fetch(`${FANART_WORKER}/admin/fanart/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${fanartToken}` },
            body: JSON.stringify({ id })
        });
        if (r.ok) {
            msg.textContent = '✓ rejected!';
            setTimeout(() => loadFanart(), 1000);
        } else { msg.textContent = '✗ failed'; }
    };

    // suggestions
    const suggestionsAdmin = document.getElementById('suggestions-admin');

    async function loadSuggestions() {
        const r = await fetch(`${FANART_WORKER}/admin/suggestions`, {
            headers: { 'Authorization': `Bearer ${fanartToken}` }
        });
        const d = await r.json();
        const unseen = (d.suggestions || []).filter(s => !s.seen);
        if (unseen.length === 0) {
            suggestionsAdmin.innerHTML = `<p class="empty-msg">no new suggestions!</p>`;
            return;
        }
        suggestionsAdmin.innerHTML = unseen.map(s => `
            <div class="admin-card" id="sugg-${s.id.replace(':', '-')}">
                <div class="admin-card-meta" style="font-size:0.95rem; line-height:1.6;">${s.suggestion}</div>
                <div class="status-row">
                    <span style="font-size:0.75rem;opacity:0.7;">${new Date(s.submittedAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span>
                    <button class="admin-btn" onclick="markSeen('${s.id}')"><i class="fa-solid fa-check"></i> mark as seen</button>
                    <span class="save-msg" id="sugg-msg-${s.id.replace(':', '-')}"></span>
                </div>
            </div>`).join('');
    }

    window.markSeen = async (id) => {
        const msg = document.getElementById(`sugg-msg-${id.replace(':', '-')}`);
        const r = await fetch(`${FANART_WORKER}/admin/suggestions/seen`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${fanartToken}` },
            body: JSON.stringify({ id })
        });
        if (r.ok) {
            msg.textContent = '✓ marked!';
            setTimeout(() => loadSuggestions(), 1000);
        } else { msg.textContent = '✗ failed'; }
    };

    init();
})();