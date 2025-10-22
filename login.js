// login-modernizado.js
// Versão modernizada e mais robusta do script de login.
// Melhorias:
// - Evita alert(); usa uma área de status acessível (aria-live)
// - Suporte a requisições assíncronas (fetch) com placeholder para integrar API real
// - Feedback visual (desabilita botão, texto de estado) e tratamento de erros
// - Foco automático melhorado e teclado (Enter) tratado com form.requestSubmit()
// - Compatibilidade progressiva (fallbacks) e logging apropriado

(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', init);

    function init() {
        const form = document.querySelector('form');
        if (!form) return console.warn('Nenhum <form> encontrado.');

        const inputCodigo = document.getElementById('codigo');
        const submitBtn = form.querySelector('button[type="submit"]') || form.querySelector('input[type="submit"]');

        // Cria/usa uma área de status acessível (aria-live) para mensagens ao utilizador
        let statusEl = document.getElementById('login-status');
        if (!statusEl) {
            statusEl = document.createElement('div');
            statusEl.id = 'login-status';
            statusEl.setAttribute('role', 'status');
            statusEl.setAttribute('aria-live', 'polite');
            statusEl.className = 'feedback';
            // Inserir logo acima do botão de submit, se existir
            if (submitBtn && submitBtn.parentNode) {
                submitBtn.parentNode.insertBefore(statusEl, submitBtn.nextSibling);
            } else {
                form.appendChild(statusEl);
            }
        }

        // Foco automático, com prevenção de rolagem desnecessária
        if (inputCodigo && typeof inputCodigo.focus === 'function') {
            try { inputCodigo.focus({ preventScroll: true }); } catch (e) { inputCodigo.focus(); }
        }

        // Enter deve submeter de forma elegante
        if (inputCodigo) {
            inputCodigo.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter') {
                    // requestSubmit preserva handlers nativos e usabilidade
                    if (typeof form.requestSubmit === 'function') form.requestSubmit();
                    else form.dispatchEvent(new Event('submit', { cancelable: true }));
                }
            });
        }

        // Intercepta o submit para validação + verificação remota (simulada aqui)
        form.addEventListener('submit', async (ev) => {
            ev.preventDefault();
            clearStatus();

            const code = inputCodigo ? inputCodigo.value.trim() : '';

            if (!code) {
                showError('⚠️ Por favor, insira o código de acesso.');
                if (inputCodigo) inputCodigo.focus();
                return;
            }

            // Bloqueia múltiplos envios
            toggleSubmitting(true);
            showInfo('🔑 Verificando código...');

            try {
                // Substitua verifyCode pelo seu endpoint real (fetch) quando estiver pronto
                const res = await verifyCode(code);

                if (res && res.ok) {
                    showSuccess('✔️ Código válido. A iniciar sessão...');
                    // Se pretende submeter ao servidor, descomente a linha abaixo para proceder com o envio real
                    // form.submit();

                    // Para demonstração simulamos um pequeno atraso antes de 'entrar'
                    setTimeout(() => {
                        // comportamento por omissão: enviar o form
                        if (typeof form.submit === 'function') form.submit();
                    }, 700);
                } else {
                    showError(res && res.message ? res.message : '❌ Código inválido. Verifique e tente novamente.');
                    if (inputCodigo) inputCodigo.select();
                }
            } catch (error) {
                console.error('Erro na verificação do código:', error);
                showError('Erro de ligação. Tente novamente mais tarde.');
            } finally {
                toggleSubmitting(false);
            }
        });

        function toggleSubmitting(isSubmitting) {
            if (submitBtn) {
                submitBtn.disabled = !!isSubmitting;
                submitBtn.setAttribute('aria-busy', isSubmitting ? 'true' : 'false');
            }
            if (inputCodigo) inputCodigo.disabled = !!isSubmitting;
        }

        function clearStatus() {
            statusEl.textContent = '';
            statusEl.classList.remove('error', 'success');
        }

        function showInfo(msg) {
            statusEl.textContent = msg;
            statusEl.classList.remove('error', 'success');
        }

        function showError(msg) {
            statusEl.textContent = msg;
            statusEl.classList.add('error');
            statusEl.classList.remove('success');
        }

        function showSuccess(msg) {
            statusEl.textContent = msg;
            statusEl.classList.remove('error');
            statusEl.classList.add('success');
        }

        // Função que faz a verificação do código.
        // Atualmente é uma simulação (substitua por fetch para verificar em servidor).
        async function verifyCode(code) {
            // Exemplo: usar fetch para API real
            // return fetch('/api/verify-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) })
            //   .then(r => r.json());

            // Simulação: espera e devolve sucesso apenas se o código for '0000' (altere conforme necessário)
            await delay(900);
            if (code === '0000') return { ok: true };
            return { ok: false, message: 'Código incorreto.' };
        }

        function delay(ms) { return new Promise((res) => setTimeout(res, ms)); }
    }
})();
