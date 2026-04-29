(() => {
    const WORKER = 'https://fanart.aishuhariharan123.workers.dev';

    // suggestion box
    const boxScene      = document.getElementById('box-scene');
    const boxHint       = document.getElementById('box-hint');
    const formWrap      = document.getElementById('suggestion-form-wrap');
    const suggText      = document.getElementById('suggestion-text');
    const charCount     = document.getElementById('char-count');
    const suggSubmit    = document.getElementById('suggestion-submit');
    const suggMsg       = document.getElementById('suggestion-msg');

    let formOpen = false;

    boxScene.addEventListener('click', () => {
        if (formOpen) return;
        formOpen = true;
        boxHint.textContent = 'type your idea!';
        formWrap.style.display = 'block';
        suggText.focus();
    });

    suggText.addEventListener('input', () => {
        const len = suggText.value.length;
        charCount.textContent = `${len} / 500`;
        charCount.classList.toggle('over', len >= 490);
        // note: disabled state is also controlled by turnstile in submission.html inline script
        if (len === 0 || len > 500) suggSubmit.disabled = true;
    });

    suggSubmit.addEventListener('click', async () => {
        const token = window._suggTurnstileToken;
        if (!token) return;

        suggSubmit.disabled = true;
        boxScene.classList.add('submitting');
        suggMsg.textContent = 'sending it in...';

        try {
            const r = await fetch(`${WORKER}/submit/suggestion`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    suggestion: suggText.value.trim(),
                    turnstileToken: token
                })
            });
            const d = await r.json();
            if (d.ok) {
                boxScene.classList.remove('submitting');
                boxScene.classList.add('submitted');
                suggMsg.textContent = 'sent! thank you!';
                suggText.value = '';
                charCount.textContent = '0 / 500';
                formWrap.style.display = 'none';
                boxHint.textContent = 'sent! thank you!';
                window._suggTurnstileToken = null;
                setTimeout(() => {
                    boxScene.classList.remove('submitted');
                    boxScene.style.cursor = 'default';
                }, 1500);
            } else {
                throw new Error(d.error || 'unknown error');
            }
        } catch (e) {
            boxScene.classList.remove('submitting');
            suggMsg.textContent = `something went wrong: ${e.message} :(`;
            suggSubmit.disabled = false;
            window._suggTurnstileToken = null;
            if (typeof turnstile !== 'undefined') turnstile.reset();
        }
    });

    // fanart form
    const dropZone     = document.getElementById('drop-zone');
    const fileInput    = document.getElementById('fanart-file');
    const fileName     = document.getElementById('file-name');
    const dropPreview  = document.getElementById('drop-preview');
    const creditName   = document.getElementById('credit-name');
    const fanartSubmit = document.getElementById('fanart-submit');
    const fanartMsg    = document.getElementById('fanart-msg');

    let selectedFile = null;
    window._selectedFile = null;

    function handleFile(file) {
        if (!file) return;
        selectedFile = file;
        window._selectedFile = file;
        fileName.textContent = file.name;
        const url = URL.createObjectURL(file);
        dropPreview.src = url;
        dropPreview.style.display = 'block';
        if (window._checkFanartReady) window._checkFanartReady();
    }

    fileInput.addEventListener('change', () => handleFile(fileInput.files[0]));

    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        handleFile(e.dataTransfer.files[0]);
    });

    fanartSubmit.addEventListener('click', async () => {
        const token = window._fanartTurnstileToken;
        if (!token || !selectedFile) return;

        fanartSubmit.disabled = true;
        fanartMsg.textContent = 'uploading...';

        const fd = new FormData();
        fd.append('image', selectedFile);
        fd.append('creditName', creditName.value.trim());
        fd.append('message', document.getElementById('fanart-message').value.trim());
        fd.append('websiteLink', document.getElementById('website-link').value.trim());
        fd.append('turnstileToken', token);

        try {
            const r = await fetch(`${WORKER}/submit/fanart`, { method: 'POST', body: fd });
            const d = await r.json();
            if (d.ok) {
                fanartMsg.textContent = "received!! it'll appear in the gallery below once i've approved it!";
                selectedFile = null;
                window._selectedFile = null;
                fileInput.value = '';
                fileName.textContent = '';
                dropPreview.style.display = 'none';
                creditName.value = '';
                document.getElementById('fanart-message').value = '';
                document.getElementById('website-link').value = '';
                window._fanartTurnstileToken = null;
                fanartSubmit.disabled = true;
                if (typeof turnstile !== 'undefined') turnstile.reset();
            } else {
                throw new Error(d.error || 'unknown error');
            }
        } catch (e) {
            fanartMsg.textContent = `something went wrong: ${e.message}`;
            fanartSubmit.disabled = false;
            window._fanartTurnstileToken = null;
            if (typeof turnstile !== 'undefined') turnstile.reset();
        }
    });

    // gallery
    const galleryGrid  = document.getElementById('gallery-grid');
    const lightbox     = document.getElementById('lightbox');
    const lightboxImg  = document.getElementById('lightbox-img');
    const lightboxCred = document.getElementById('lightbox-credit');

    document.getElementById('lightbox-close').addEventListener('click', () => lightbox.classList.remove('open'));
    lightbox.addEventListener('click', e => { if (e.target === lightbox) lightbox.classList.remove('open'); });

    async function loadGallery() {
        try {
            const r = await fetch(`${WORKER}/gallery`);
            const d = await r.json();
            if (!d.fanart || d.fanart.length === 0) {
                galleryGrid.innerHTML = `<div class="gallery-empty"><i class="fa-solid fa-heart"></i><br/>no fanart yet. you must be early :0</div>`;
                return;
            }
            galleryGrid.innerHTML = d.fanart.map(f => `
                <div class="gallery-item" data-url="${f.imageUrl}" data-credit="${f.creditName}">
                    <img src="${f.imageUrl}" alt="fanart by ${f.creditName}" loading="lazy"/>
                    <div class="gallery-tooltip">art by ${f.creditName}</div>
                </div>
            `).join('');

            galleryGrid.querySelectorAll('.gallery-item').forEach(item => {
                item.addEventListener('click', () => {
                    lightboxImg.src = item.dataset.url;
                    lightboxCred.textContent = `art by ${item.dataset.credit}`;
                    lightbox.classList.add('open');
                });
            });
        } catch {
            galleryGrid.innerHTML = `<div class="gallery-empty"><i class="fa-solid fa-triangle-exclamation"></i> couldn't load gallery. try refreshing!</div>`;
        }
    }

    loadGallery();
})();