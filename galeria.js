(function () {
    const gallery = document.querySelectorAll('.photo-card');
    const lightbox = document.getElementById('glightbox');
    const lbImg = document.getElementById('lb-img');
    const lbCaption = document.getElementById('lb-caption');
    const lbClose = document.getElementById('lb-close');
    const lbNext = document.getElementById('lb-next');
    const lbPrev = document.getElementById('lb-prev');
    const lbDownload = document.getElementById('lb-download');
    const lbCounter = document.getElementById('lb-counter');

    let current = 0;
    const total = gallery.length;

    // Prepara galerie: clic, botões e keyboard focus
    gallery.forEach((card, idx) => {
        const img = card.querySelector('img');
        card.dataset.index = idx;
        // botão interno
        const btn = card.querySelector('.view-btn');
        btn.addEventListener('click', () => open(idx));
        // click na imagem (ou Enter/Space)
        img.addEventListener('click', () => open(idx));
        img.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(idx); }
        });
        // keyboard focus style handled by CSS :focus-within
    });

    function open(index) {
        current = Number(index);
        const card = gallery[current];
        const img = card.querySelector('img');
        const full = img.dataset.fullsrc || img.currentSrc || img.src;
        lbImg.src = full;
        lbImg.alt = img.alt || '';
        lbCaption.textContent = img.dataset.caption || img.alt || '';
        lbCounter.textContent = (current + 1) + ' / ' + total;
        // download link
        lbDownload.onclick = () => {
            const a = document.createElement('a');
            a.href = full;
            a.download = (new URL(full, location.href).pathname.split('/').pop()) || 'image';
            document.body.appendChild(a);
            a.click();
            a.remove();
        };
        // show
        lightbox.classList.add('open');
        lightbox.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        lbClose.focus();
        // preload next
        preload(current + 1);
    }

    function close() {
        lightbox.classList.remove('open');
        lightbox.setAttribute('aria-hidden', 'true');
        lbImg.src = '';
        document.body.style.overflow = '';
    }

    function next() {
        current = (current + 1) % total;
        open(current);
    }
    function prev() {
        current = (current - 1 + total) % total;
        open(current);
    }

    function preload(idx) {
        if (idx < 0 || idx >= total) return;
        const img = gallery[idx].querySelector('img');
        const src = img.dataset.fullsrc || img.src;
        const i = new Image();
        i.src = src;
    }

    // eventos dos botões
    lbClose.addEventListener('click', close);
    lbNext.addEventListener('click', next);
    lbPrev.addEventListener('click', prev);

    // clique fora fecha
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) close(); });

    // keyboard
    document.addEventListener('keydown', (e) => {
        if (lightbox.classList.contains('open')) {
            if (e.key === 'Escape') close();
            if (e.key === 'ArrowRight') next();
            if (e.key === 'ArrowLeft') prev();
        }
    });

    // touch swipe (simples)
    let touchStartX = 0;
    let touchEndX = 0;
    lbImg.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
    lbImg.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        if (touchEndX - touchStartX > 40) prev();
        if (touchStartX - touchEndX > 40) next();
    }, { passive: true });

    // prevenção: se imagem falhar, fecha
    lbImg.addEventListener('error', () => {
        lbCaption.textContent = 'Não foi possível carregar a imagem.';
    });

})();





/* ====== Script Modernizador para a Seção de Vídeos ====== */
document.addEventListener('DOMContentLoaded', () => {
    const grid = document.querySelector('.video-grid');
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll('.video-card'));
    // Adiciona overlay de play grande em cada card (não altera sua estrutura original)
    cards.forEach(card => {
        // só adiciona se já não existir
        if (!card.querySelector('.play-overlay')) {
            const overlay = document.createElement('div');
            overlay.className = 'play-overlay';
            const bigPlay = document.createElement('button');
            bigPlay.className = 'big-play';
            bigPlay.setAttribute('aria-label', 'Reproduzir vídeo');
            bigPlay.innerHTML = '▶';
            overlay.appendChild(bigPlay);
            card.appendChild(overlay);

            // clique no bigPlay ou na thumb abre reprodução inline (toggle)
            bigPlay.addEventListener('click', (e) => {
                e.stopPropagation();
                const vid = card.querySelector('video');
                togglePlayInline(vid);
            });
        }
    });

    // garante que apenas um vídeo toca por vez
    function pauseAllExcept(except) {
        cards.forEach(c => {
            const v = c.querySelector('video');
            if (v && v !== except) {
                try { v.pause(); } catch (e) { }
            }
        });
    }

    // tocar/pausar inline
    function togglePlayInline(videoEl) {
        if (!videoEl) return;
        if (videoEl.paused) {
            pauseAllExcept(videoEl);
            videoEl.play().catch(() => { /* autoplay blocks */ });
        } else {
            videoEl.pause();
        }
    }

    // Delegation: clicks em play-btn / view-btn / thumbnail / download
    grid.addEventListener('click', (e) => {
        const playBtn = e.target.closest('.play-btn');
        if (playBtn) {
            const card = playBtn.closest('.video-card');
            const v = card.querySelector('video');
            togglePlayInline(v);
            return;
        }

        const viewBtn = e.target.closest('.view-btn');
        if (viewBtn) {
            const card = viewBtn.closest('.video-card');
            openModalForIndex(Number(card.dataset.index));
            return;
        }

        const thumb = e.target.closest('.thumb-video');
        if (thumb) {
            const card = thumb.closest('.video-card');
            openModalForIndex(Number(card.dataset.index));
            return;
        }
    });

    // parar reprodução ao trocar de aba / navegar away
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) pauseAllExcept(null);
    });

    /* ===== Modal player ===== */
    let modalOverlay = null;
    let currentIndex = 0;
    let previouslyFocused = null;

    function openModalForIndex(idx) {
        currentIndex = clamp(idx);
        previouslyFocused = document.activeElement;

        // prevenir múltiplos modais
        if (modalOverlay) return;

        // criar overlay
        modalOverlay = document.createElement('div');
        modalOverlay.className = 'video-modal-overlay';
        modalOverlay.setAttribute('role', 'dialog');
        modalOverlay.setAttribute('aria-modal', 'true');
        modalOverlay.setAttribute('aria-label', 'Visualizador de vídeos');

        // container
        const modal = document.createElement('div');
        modal.className = 'video-modal';
        modalOverlay.appendChild(modal);

        // player wrap
        const wrap = document.createElement('div');
        wrap.className = 'player-wrap';
        modal.appendChild(wrap);

        // cria elemento video (com controls nativos)
        const vid = document.createElement('video');
        vid.setAttribute('controls', '');
        vid.setAttribute('playsinline', '');
        vid.setAttribute('preload', 'metadata');
        vid.style.maxHeight = '72vh';
        vid.style.background = '#000';
        wrap.appendChild(vid);

        // controls area
        const controls = document.createElement('div');
        controls.className = 'modal-controls';
        modal.appendChild(controls);

        const left = document.createElement('div');
        left.className = 'left';
        controls.appendChild(left);

        const right = document.createElement('div');
        right.className = 'right';
        controls.appendChild(right);

        // botões
        const prevBtn = document.createElement('button');
        prevBtn.className = 'modal-btn';
        prevBtn.setAttribute('aria-label', 'Imagem anterior');
        prevBtn.textContent = '‹';
        left.appendChild(prevBtn);

        const playBtn = document.createElement('button');
        playBtn.className = 'modal-btn primary';
        playBtn.setAttribute('aria-label', 'Play/Pause');
        playBtn.textContent = 'Play';
        left.appendChild(playBtn);

        const nextBtn = document.createElement('button');
        nextBtn.className = 'modal-btn';
        nextBtn.setAttribute('aria-label', 'Próxima imagem');
        nextBtn.textContent = '›';
        left.appendChild(nextBtn);

        // pip/download/close
        const pipBtn = document.createElement('button');
        pipBtn.className = 'modal-btn';
        pipBtn.setAttribute('aria-label', 'Picture in Picture');
        pipBtn.textContent = 'PIP';
        right.appendChild(pipBtn);

        const downloadAnchor = document.createElement('a');
        downloadAnchor.className = 'modal-btn';
        downloadAnchor.setAttribute('download', '');
        downloadAnchor.textContent = 'Baixar';
        right.appendChild(downloadAnchor);

        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-btn';
        closeBtn.setAttribute('aria-label', 'Fechar');
        closeBtn.textContent = 'Fechar';
        right.appendChild(closeBtn);

        // caption & index
        const captionEl = document.createElement('div');
        captionEl.className = 'modal-caption';
        modal.appendChild(captionEl);

        const indexEl = document.createElement('div');
        indexEl.className = 'modal-index';
        modal.appendChild(indexEl);

        // adiciona no DOM
        document.body.appendChild(modalOverlay);

        // prev/next handlers
        prevBtn.addEventListener('click', (ev) => { ev.preventDefault(); navigate(-1); });
        nextBtn.addEventListener('click', (ev) => { ev.preventDefault(); navigate(1); });

        // play/pause
        playBtn.addEventListener('click', () => {
            if (vid.paused) { vid.play(); } else { vid.pause(); }
        });

        // close
        closeBtn.addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', (ev) => {
            // fecha se clicar fora do modal interno
            if (ev.target === modalOverlay) closeModal();
        });

        // pip
        pipBtn.addEventListener('click', async () => {
            if ('pictureInPictureEnabled' in document) {
                try {
                    if (document.pictureInPictureElement) {
                        await document.exitPictureInPicture();
                    } else {
                        await vid.requestPictureInPicture();
                    }
                } catch (err) { /* ignora */ }
            } else {
                // opcional: feedback mínimo
                pipBtn.disabled = true;
                setTimeout(() => pipBtn.disabled = false, 900);
            }
        });

        // download link update
        downloadAnchor.addEventListener('click', () => {
            // link segue href já definido
        });

        // impedir scroll do fundo
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        // teclado
        function keyHandler(e) {
            if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); navigate(-1); }
            else if (e.key === 'ArrowRight') { e.preventDefault(); navigate(1); }
            else if (e.key === ' ' || e.code === 'Space') {
                // evita scroll quando modal focado
                if (document.activeElement === document.body || modalOverlay.contains(document.activeElement)) {
                    e.preventDefault();
                    if (vid.paused) vid.play(); else vid.pause();
                }
            }
        }
        document.addEventListener('keydown', keyHandler);

        // swipe support
        let touchStartX = 0;
        modalOverlay.addEventListener('touchstart', (ev) => {
            if (ev.touches && ev.touches[0]) touchStartX = ev.touches[0].clientX;
        }, { passive: true });
        modalOverlay.addEventListener('touchend', (ev) => {
            if (!ev.changedTouches || !ev.changedTouches[0]) return;
            const dx = ev.changedTouches[0].clientX - touchStartX;
            if (dx > 40) navigate(-1);
            if (dx < -40) navigate(1);
        }, { passive: true });

        // quando o vídeo termina, atualiza botão
        vid.addEventListener('play', () => { playBtn.textContent = 'Pausar'; pauseAllExcept(vid); });
        vid.addEventListener('pause', () => { playBtn.textContent = 'Play'; });

        // timeupdate (podemos exibir tempo futuro se quiser)
        // vid.addEventListener('timeupdate', ...);

        // Atualiza view inicial
        function updateView() {
            const card = cards[currentIndex];
            const thumb = card.querySelector('video');
            const full = thumb.getAttribute('data-fullsrc') || (thumb.querySelector('source') ? thumb.querySelector('source').src : '');
            const caption = thumb.getAttribute('data-caption') || card.querySelector('.caption .caption-sub')?.textContent || '';
            vid.src = full;
            vid.poster = thumb.getAttribute('poster') || '';
            captionEl.textContent = caption;
            indexEl.textContent = `${currentIndex + 1} / ${cards.length}`;
            downloadAnchor.href = full || '#';

            // preload adjacentes
            preloadIndex(currentIndex + 1);
            preloadIndex(currentIndex - 1);

            // autoplay attempt
            vid.currentTime = 0;
            vid.play().catch(() => { /* autoplay blocked; user can press play */ });
        }
        updateView();

        // navigate
        function navigate(delta) {
            currentIndex = clamp(currentIndex + delta);
            updateView();
        }

        // preload helper
        function preloadIndex(i) {
            const idx = clamp(i);
            const card = cards[idx];
            if (!card) return;
            const v = card.querySelector('video');
            const src = v.getAttribute('data-fullsrc') || (v.querySelector('source') ? v.querySelector('source').src : '');
            if (!src) return;
            const p = document.createElement('link');
            p.rel = 'preload';
            p.as = 'video';
            p.href = src;
            document.head.appendChild(p);
            // remove depois de um tempo para evitar poluição
            setTimeout(() => p.remove(), 60000);
        }

        // cleanup
        function closeModal() {
            try {
                vid.pause();
            } catch (e) { }
            document.removeEventListener('keydown', keyHandler);
            document.body.style.overflow = prevOverflow || '';
            if (modalOverlay && modalOverlay.parentNode) modalOverlay.parentNode.removeChild(modalOverlay);
            modalOverlay = null;
            // restaura foco
            try { if (previouslyFocused) previouslyFocused.focus(); } catch (e) { }
        }
    }

    function clamp(i) {
        const n = cards.length || 1;
        return ((i % n) + n) % n;
    }
});
