/* formulario.js
   Progressive enhancement: client validation, AJAX submit with JSON response support,
   accessible messages, double-submit protection, honeypot respected.
*/

(function () {
    'use strict';

    // Utility helpers
    function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
    function el(tag, props) { const e = document.createElement(tag); if (props) Object.assign(e, props); return e; }
    function text(node, str) { node.textContent = String(str); return node; }

    // Init on DOM ready
    document.addEventListener('DOMContentLoaded', () => {
        const form = qs('#contactForm');
        if (!form) return;

        const nome = qs('#nome', form);
        const email = qs('#email', form);
        const mensagem = qs('#mensagem', form);
        const submitBtn = qs('button[type="submit"]', form);
        const flashWrap = qs('.flash-wrap') || (function () { const d = el('div'); d.className = 'flash-wrap'; form.parentNode.insertBefore(d, form); return d; })();

        // ARIA live
        flashWrap.setAttribute('aria-live', 'polite');

        // Field error handlers
        function clearFieldError(elm) {
            if (!elm || !elm.parentNode) return;
            const fe = elm.parentNode.querySelector('.field-error');
            if (fe) fe.remove();
            elm.removeAttribute('aria-invalid');
        }
        function setFieldError(elm, message) {
            if (!elm || !elm.parentNode) return;
            clearFieldError(elm);
            const div = el('div'); div.className = 'field-error'; div.textContent = message;
            elm.parentNode.insertBefore(div, elm.nextSibling);
            elm.setAttribute('aria-invalid', 'true');
        }
        function clearAllErrors() {
            [nome, email, mensagem].forEach(clearFieldError);
            flashWrap.innerHTML = '';
        }

        // Flash messages
        function showFlash(msg, type = 'success') {
            flashWrap.innerHTML = '';
            const f = el('div'); f.className = 'form-message ' + (type === 'error' ? 'error' : 'success');
            text(f, msg);
            flashWrap.appendChild(f);
            if (type !== 'error') setTimeout(() => { if (f.parentNode) f.parentNode.removeChild(f); }, 6000);
            // bring into view for keyboard users
            f.focus && f.focus();
        }

        // Basic client-side validation
        function validate() {
            clearAllErrors();
            let ok = true;
            if (!nome.value.trim() || nome.value.trim().length < 2) { setFieldError(nome, 'Nome obrigatório (mín. 2 caracteres).'); ok = false; }
            if (!email.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) { setFieldError(email, 'Email inválido.'); ok = false; }
            if (!mensagem.value.trim() || mensagem.value.trim().length < 6) { setFieldError(mensagem, 'Mensagem muito curta (mín. 6 caracteres).'); ok = false; }
            return ok;
        }

        // Toggle loading UI
        function setLoading(on, label) {
            if (on) {
                submitBtn.disabled = true;
                submitBtn.classList.add('loading');
                submitBtn.dataset.orig = submitBtn.innerHTML;
                submitBtn.innerHTML = (label || 'Enviando...') + ' <span aria-hidden="true">⏳</span>';
                form.setAttribute('aria-busy', 'true');
            } else {
                submitBtn.disabled = false;
                submitBtn.classList.remove('loading');
                if (submitBtn.dataset.orig) submitBtn.innerHTML = submitBtn.dataset.orig;
                form.removeAttribute('aria-busy');
            }
        }

        // Submit handler (AJAX with fallback)
        form.addEventListener('submit', async function (e) {
            e.preventDefault();
            clearAllErrors();
            if (!validate()) return;

            // Respect honeypot server behavior: the form includes #phone hidden field
            const hp = qs('#phone', form);
            if (hp && hp.value.trim().length > 0) {
                // Bot — behave politely and stop
                showFlash('Obrigado pelo contato.', 'success');
                return;
            }

            setLoading(true);
            const fd = new FormData(form);

            try {
                const res = await fetch(form.action || window.location.href, {
                    method: form.method || 'POST',
                    credentials: 'same-origin',
                    headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' },
                    body: fd
                });

                const ctype = res.headers.get('content-type') || '';
                const isJson = ctype.indexOf('application/json') !== -1;

                if (isJson) {
                    const data = await res.json();
                    if (data && (data.status === 'ok' || res.status === 200)) {
                        showFlash(data.message || 'Mensagem enviada!', 'success');
                        form.reset();
                        // focus first input again
                        setTimeout(() => nome.focus(), 80);
                    } else {
                        showFlash((data && data.message) ? data.message : 'Erro ao enviar a mensagem.', 'error');
                    }
                } else {
                    // Non-JSON -> server-side rendered HTML: reload to let server show messages
                    window.location.reload();
                }
            } catch (err) {
                // network error -> fallback to native submit (graceful degrade)
                console.warn('AJAX falhou, fallback para submit normal. ', err);
                // remove our event handler to avoid loop, then submit
                form.removeEventListener('submit', arguments.callee);
                form.submit();
            } finally {
                setLoading(false);
            }
        });

        // Clear field error on input
        [nome, email, mensagem].forEach(i => i && i.addEventListener('input', () => clearFieldError(i)));

        // Accessibility: allow Ctrl/Cmd+Enter in textarea to submit
        if (mensagem) {
            mensagem.addEventListener('keydown', (ev) => {
                if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') {
                    ev.preventDefault();
                    if (validate()) submitBtn.click();
                }
            });
        }
    });
})();
