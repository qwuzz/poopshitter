(() => {
    // --- commission data ---
    const ANIMABLE = ['small-pixel-icon','pixel-icon','regular-icon','feral-pagedoll','anthro-pagedoll'];
    const TWEENABLE = ['regular-icon'];
    const BG_TYPES  = ['small-pixel-icon','pixel-icon','regular-icon','feral-pagedoll','anthro-pagedoll'];
    const PRICES = {
        'small-pixel-icon':   { base: 8,  anim: 18 },
        'pixel-icon':         { base: 12, anim: 30 },
        'regular-icon':       { base: 24, tweened: 36,anim: 56 },
        'feral-pagedoll':     { base: 16, anim: 42 },
        'anthro-pagedoll':    { base: 21, anim: 56 },
        'ref-sheet':          { base: 32 },
        'custom-design':      { base: 16 },
        'custom-design-ref':  { base: 48 },
    };

    // --- element refs ---
    const commType      = document.getElementById('comm-type');
    const bgGroup       = document.getElementById('bg-pref-group');
    const pricePreview  = document.getElementById('price-preview');
    const paymentSel    = document.getElementById('payment-method');
    const paymentNote   = document.getElementById('payment-note');
    const contactSel    = document.getElementById('contact-method');
    const contactGrp    = document.getElementById('contact-handle-group');
    const contactLabel  = document.getElementById('contact-handle-label');
    const contactInput  = document.getElementById('contact-handle');
    const tosToggleBtn  = document.getElementById('tos-toggle');
    const tosBody       = document.getElementById('tos-body');
    const tosChevron    = document.getElementById('tos-chevron');
    const tosAgree      = document.getElementById('tos-agree');
    const submitBtn     = document.getElementById('submit-btn');
    const submitMsg     = document.getElementById('submit-msg');
    const slotsBanner   = document.getElementById('slots-banner');
    const formClosedMsg = document.getElementById('form-closed-msg');

    let slotsOpen = null; 

    async function loadSlots() {
        try {
            const r = await fetch('https://commissions.aishuhariharan123.workers.dev/slots');
            const d = await r.json();
            slotsOpen = d.slots;
            if (slotsOpen > 0) {
                slotsBanner.innerHTML = `<i class="fa-solid fa-circle-check"></i> commissions are <strong>OPEN!</strong><span class="slot-count">${slotsOpen} slot${slotsOpen !== 1 ? 's' : ''} available</span>`;
                slotsBanner.classList.remove('closed');
            } else {
                slotsBanner.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> commissions are <strong>CLOSED</strong> right now — check back soon!`;
                slotsBanner.classList.add('closed');
                disableForm("commissions are currently closed! check back soon. 💔");
            }
        } catch {
            slotsBanner.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> couldn't load slot info — try refreshing!`;
        }
    }

    function disableForm(msg) {
        formClosedMsg.textContent = msg;
        formClosedMsg.style.display = 'block';
        [...document.getElementById('comm-form').querySelectorAll('select,input,textarea,button')].forEach(el => el.disabled = true);
    }

    const animTypeGroup  = document.getElementById('anim-type-group');
    const animTypeSelect = document.getElementById('anim-type');
    
    
    // commission type change
    commType.addEventListener('change', () => {
        const v = commType.value;
        const p = PRICES[v];

        bgGroup.style.display = BG_TYPES.includes(v) ? 'flex' : 'none';

        if (ANIMABLE.includes(v)) {
            animTypeGroup.style.display = 'flex';
            let opts = `<option value="none">No animation ($${p.base})</option>`;
            if (TWEENABLE.includes(v) && p.tweened) {
                opts += `<option value="tweened">Tweened animation ($${p.tweened})</option>`;
            }
            opts += `<option value="full">Full frame animation ($${p.anim})</option>`;
            animTypeSelect.innerHTML = opts;
            animTypeSelect.value = 'none';
        } else {
            animTypeGroup.style.display = 'none';
        }

        p ? updatePrice() : (pricePreview.style.display = 'none');
        updateSubmit();
    });


    animTypeSelect.addEventListener('change', updatePrice);

    function updatePrice() {
        const v = commType.value;
        const p = PRICES[v];
        if (!p) return;
        let total = p.base;
        if (ANIMABLE.includes(v)) {
            const a = animTypeSelect.value;
            if (a === 'tweened' && p.tweened) total = p.tweened;
            else if (a === 'full') total = p.anim;
        }
        pricePreview.textContent = `estimated total: $${total}`;
        pricePreview.style.display = 'block';
    }

    // --- payment method ---
    paymentSel.addEventListener('change', () => {
        const v = paymentSel.value;
        document.getElementById('paypal-info').style.display  = v === 'paypal'   ? 'flex' : 'none';
        document.getElementById('cashapp-info').style.display = v === 'cashapp'  ? 'flex' : 'none';
        document.getElementById('venmo-info').style.display   = v === 'venmo'    ? 'flex' : 'none';

        if (v === 'paypal') {
            paymentNote.textContent = "PayPal is my preferred payment method — I'll send you an invoice to this email!";
            paymentNote.style.display = 'block';
        } else if (v === 'cashapp' || v === 'venmo') {
            paymentNote.textContent = `${v === 'cashapp' ? 'CashApp' : 'Venmo'} is available for folks who don't have PayPal!`;
            paymentNote.style.display = 'block';
        } else {
            paymentNote.style.display = 'none';
        }
        updateSubmit();
    });

    // --- contact method ---
    const contactPlaceholders = { discord: 'username (e.g. qwizz)', toyhouse: 'your toyhouse @ handle', email: 'your email address' };
    const contactLabels       = { discord: 'Discord Username *', toyhouse: 'Toyhouse Handle *', email: 'Email Address *' };

    contactSel.addEventListener('change', () => {
        const v = contactSel.value;
        if (v) {
            contactGrp.style.display = 'flex';
            contactLabel.textContent  = contactLabels[v];
            contactInput.placeholder  = contactPlaceholders[v];
            contactInput.type = v === 'email' ? 'email' : 'text';
        } else {
            contactGrp.style.display = 'none';
        }
        updateSubmit();
    });

    // --- tos accordion ---
    tosToggleBtn.addEventListener('click', () => {
        tosBody.classList.toggle('open');
        tosChevron.style.transform = tosBody.classList.contains('open') ? 'rotate(180deg)' : '';
    });

    // --- submit validation ---
    tosAgree.addEventListener('change', updateSubmit);
    document.getElementById('comm-form').addEventListener('input', updateSubmit);

    function updateSubmit() {
        if (slotsOpen !== null && slotsOpen <= 0) { submitBtn.disabled = true; return; }
        const hasType    = !!commType.value;
        const hasChar    = !!document.getElementById('char-name').value.trim();
        const hasRef     = !!document.getElementById('ref-link').value.trim();
        const hasPay     = !!paymentSel.value;
        const hasPayInfo = (paymentSel.value === 'paypal'   && document.getElementById('paypal-email').value.trim())  ||
                            (paymentSel.value === 'cashapp'  && document.getElementById('cashapp-tag').value.trim())   ||
                            (paymentSel.value === 'venmo'    && document.getElementById('venmo-handle').value.trim());
        const hasContact = !!contactSel.value && !!contactInput.value.trim();
        const hasTos     = tosAgree.checked;
        submitBtn.disabled = !(hasType && hasChar && hasRef && hasPay && hasPayInfo && hasContact && hasTos);
    }

    // --- submit ---
    submitBtn.addEventListener('click', async () => {
        submitBtn.disabled = true;
        submitMsg.textContent = 'sending...';

        const v = commType.value;
        const p = PRICES[v];
        const animVal = ANIMABLE.includes(v) ? animTypeSelect.value : 'none';

        let total = p.base;
        let isAnim = false;
        if (animVal === 'tweened' && p.tweened) { total = p.tweened; isAnim = true; }
        else if (animVal === 'full')             { total = p.anim;    isAnim = true; }

        const payload = {
            commissionType: commType.options[commType.selectedIndex].text,
            animated: isAnim,
            animationType: animVal,
            background: document.getElementById('bg-pref').value || 'n/a',
            estimatedPrice: total,
            characterName: document.getElementById('char-name').value.trim(),
            referenceLink: document.getElementById('ref-link').value.trim(),
            notes: document.getElementById('extra-notes').value.trim(),
            paymentMethod: paymentSel.value,
            paymentInfo: paymentSel.value === 'paypal'  ? document.getElementById('paypal-email').value.trim()
                        : paymentSel.value === 'cashapp' ? document.getElementById('cashapp-tag').value.trim()
                        : document.getElementById('venmo-handle').value.trim(),
            contactMethod: contactSel.value,
            contactHandle: contactInput.value.trim(),
        };

        try {
            const r = await fetch('https://commissions.aishuhariharan123.workers.dev/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const d = await r.json();
            if (d.ok) {
                submitMsg.textContent = "you're in!! 🎉 i'll reach out to you soon via ur chosen contact method. keep an eye on the commission queue page!";
                submitMsg.style.color = 'white';
                document.getElementById('comm-form').querySelectorAll('select,input,textarea').forEach(el => el.value = '');
                animTypeGroup.style.display = 'none';
                pricePreview.style.display = 'none';
                loadSlots();
            } else {
                throw new Error(d.error || 'unknown error');
            }
        } catch (e) {
            submitMsg.textContent = `something went wrong: ${e.message}. please try again or reach out directly!`;
            submitBtn.disabled = false;
        }
    });

    loadSlots();
})();