/**
 * Master Control Panel — logique UI (heure serveur MT5 via URL).
 */
(function () {
    // 1. Signaler immédiatement à Telegram que l'application est prête à être affichée
    try {
        if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
            Telegram.WebApp.ready();
            Telegram.WebApp.expand();
        }
    } catch (e) {
        console.warn('Telegram WebApp SDK not available:', e);
    }

    function init() {
        const params = new URLSearchParams(window.location.search);
        const balance = parseFloat(params.get('balance') || '10000');
        const equity = parseFloat(params.get('equity') || '10000');
        const pnl = parseFloat(params.get('pnl') || '0');
        const tier = parseFloat(params.get('tier') || '10000');
        const ftmoTarget = parseFloat(params.get('ftmo_target') || String(tier * 0.1));
        const dailyLimit = parseFloat(params.get('daily_limit') || '450');
        const totalLimit = parseFloat(params.get('total_limit') || '900');
        const lockActive = params.get('lock') === '1';
        const xauSlot = params.get('xau_slot') || 'free';
        const xauDetail = params.get('xau_detail') || '';
        const serverHour = parseInt(params.get('server_hour') || '-1', 10);
        const serverMin = parseInt(params.get('server_min') || '0', 10);
        const tradesParam = params.get('trades') || '';

        const procActive = (v) => v === '1' || v === 'true' || (v && v.includes('\uD83D\uDFE2'));

        const nas = params.get('nas100') || '0';
        const xau = params.get('xauusd') || '0';
        const eur = params.get('eurusd') || '0';
        const gld = params.get('gold') || '0';
        const mon = params.get('monitor') || '0';
        const sup = params.get('supervisor') || '0';

        const _el = (id) => document.getElementById(id);

        if (_el('val-balance'))
            _el('val-balance').innerText =
                balance.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $';
        if (_el('val-equity'))
            _el('val-equity').innerText =
                equity.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $';

        const pnlEl = _el('val-pnl');
        if (pnlEl) {
            const pnlFmt = Math.abs(pnl).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            if (pnl >= 0) {
                pnlEl.innerText = '+' + pnlFmt + ' $';
                pnlEl.className = 'circle-pnl-value pnl-positive';
            } else {
                pnlEl.innerText = '-' + pnlFmt + ' $';
                pnlEl.className = 'circle-pnl-value pnl-negative';
            }
        }

        const circle = _el('progress-circle');
        if (circle) {
            const percent = Math.min(100, Math.max(0, (pnl / ftmoTarget) * 100));
            circle.setAttribute('stroke-dashoffset', String(377 - (percent / 100) * 377));
            if (pnl < 0) circle.setAttribute('stroke', 'var(--accent-red)');
        }

        const setDot = (id, active) => {
            const el = _el(id);
            if (el) el.className = active ? 'process-dot dot-green' : 'process-dot dot-red';
        };
        setDot('dot-nas100', procActive(nas));
        setDot('dot-xauusd', procActive(xau));
        setDot('dot-eurusd', procActive(eur));
        setDot('dot-gold', procActive(gld));
        setDot('dot-monitor', procActive(mon));
        setDot('dot-supervisor', procActive(sup));

        const slotEl = _el('xau-slot-status');
        if (slotEl) {
            if (xauSlot === 'free') {
                slotEl.innerHTML = '<span style="color:var(--accent-green)">Slot libre</span> \u2014 les deux bots or peuvent entrer au prochain signal.';
            } else if (xauSlot === 'xauusd') {
                slotEl.innerHTML = `<span style="color:var(--accent-gold)">Occup\u00e9 par XAUUSD SMC</span>${xauDetail ? ' (' + xauDetail + ')' : ''}`;
            } else if (xauSlot === 'gold') {
                slotEl.innerHTML = `<span style="color:var(--accent-gold)">Occup\u00e9 par Gold Trend</span>${xauDetail ? ' (' + xauDetail + ')' : ''}`;
            } else {
                slotEl.innerHTML = '<span style="color:var(--accent-red)">Position or active</span>';
            }
        }

        const riskGrid = _el('risk-ftmo-grid');
        const cfg = typeof STRATEGY_CONFIG !== 'undefined' ? STRATEGY_CONFIG : null;
        if (cfg && riskGrid) {
            const rows = Object.entries(cfg.strategies).map(([key, s]) =>
                `<div><span style="color:var(--text-secondary)">${s.icon} ${s.label}</span><br><strong>${s.riskPercent}%</strong> / trade</div>`
            ).join('');
            riskGrid.innerHTML = rows +
                `<div><span style="color:var(--text-secondary)">Palier FTMO</span><br><strong>${tier.toLocaleString('fr-FR')} $</strong></div>` +
                `<div><span style="color:var(--text-secondary)">Limite jour</span><br><strong>${dailyLimit.toLocaleString('fr-FR')} $</strong></div>` +
                `<div><span style="color:var(--text-secondary)">Verrou</span><br><strong>${lockActive ? 'ACTIF' : 'Inactif'}</strong></div>`;
        }

        function renderHoursFromConfig() {
            if (!cfg) return;
            Object.keys(cfg.strategies).forEach((key) => {
                const s = cfg.strategies[key];
                const wrap = _el('hours-badges-' + key);
                if (wrap) {
                    wrap.innerHTML = '';
                    s.allowedHours.forEach((h) => {
                        const span = document.createElement('span');
                        span.className = 'hour-badge';
                        span.dataset.hour = String(h);
                        span.innerText = String(h).padStart(2, '0') + 'h';
                        wrap.appendChild(span);
                    });
                }
                const toggle = _el('toggle-' + key);
                const titleSpan = toggle && toggle.closest('details') && toggle.closest('details').querySelector('summary > div > span');
                if (titleSpan) titleSpan.innerText = (s.icon ? s.icon + ' ' : '') + s.label;
            });
        }
        renderHoursFromConfig();

        const tradeContainer = _el('trade-history-container');
        if (tradeContainer) {
            if (tradesParam) {
                tradesParam.split(';').forEach((t) => {
                    const parts = t.split('|');
                    if (parts.length < 4) return;
                    const [symbol, type, volume, profitStr] = parts;
                    const profit = parseFloat(profitStr);
                    const profitClass = profit >= 0 ? 'metric-value pnl-positive' : 'metric-value pnl-negative';
                    const card = document.createElement('div');
                    card.className = 'process-card';
                    card.style.padding = '10px 12px';
                    card.innerHTML = `
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span class="process-dot ${type === 'BUY' ? 'dot-green' : 'dot-red'}"></span>
                        <div>
                            <div style="font-size:13px;font-weight:700;">${symbol}</div>
                            <div style="font-size:10px;color:var(--text-secondary);">${type} - ${volume} lot</div>
                        </div>
                    </div>
                    <span class="${profitClass}" style="font-size:14px;font-weight:700;">${profit >= 0 ? '+' : ''}${profit.toFixed(2)} $</span>`;
                    tradeContainer.appendChild(card);
                });
            } else {
                tradeContainer.innerHTML =
                    '<div style="text-align:center;color:var(--text-secondary);font-size:11px;padding:12px;">Aucun trade clos (7 j)</div>';
            }
        }

        const bots = [
            { id: 'nas100', active: procActive(nas) },
            { id: 'xauusd', active: procActive(xau) },
            { id: 'eurusd', active: procActive(eur) },
            { id: 'gold', active: procActive(gld) },
        ];
        bots.forEach((bot) => {
            const toggle = _el('toggle-' + bot.id);
            const badge = _el('badge-status-' + bot.id);
            if (toggle) {
                toggle.checked = bot.active;
                toggle.addEventListener('change', () => {
                    if (badge) {
                        badge.innerText = toggle.checked ? 'ON' : 'OFF';
                        badge.className = toggle.checked ? 'process-badge active' : 'process-badge inactive';
                    }
                });
            }
            if (badge) {
                badge.innerText = bot.active ? 'ON' : 'OFF';
                badge.className = bot.active ? 'process-badge active' : 'process-badge inactive';
            }
        });

        const btnCancel = _el('btn-cancel');
        if (btnCancel) {
            btnCancel.addEventListener('click', () => {
                try {
                    if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
                        Telegram.WebApp.close();
                    }
                } catch (e) {}
            });
        }

        const navBacktest = _el('nav-backtest');
        if (navBacktest) {
            navBacktest.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = 'backtest.html' + window.location.search;
            });
        }

        const btnApply = _el('btn-apply');
        if (btnApply) {
            btnApply.addEventListener('click', () => {
                try {
                    if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
                        Telegram.WebApp.sendData(JSON.stringify({
                            action: 'toggle_bots',
                            nas100: _el('toggle-nas100') ? _el('toggle-nas100').checked : false,
                            xauusd: _el('toggle-xauusd') ? _el('toggle-xauusd').checked : false,
                            eurusd: _el('toggle-eurusd') ? _el('toggle-eurusd').checked : false,
                            gold: _el('toggle-gold') ? _el('toggle-gold').checked : false,
                        }));
                    }
                } catch (err) {
                    alert('Ouvrez le panel via le bouton clavier en bas du chat pour appliquer les changements.');
                }
            });
        }

        function highlightServerHour() {
            const clock = _el('server-clock-badge');
            if (serverHour >= 0 && clock) {
                clock.innerText = 'Serveur MT5 ' + String(serverHour).padStart(2, '0') + ':' + String(serverMin).padStart(2, '0');
            }
            const h = serverHour >= 0 ? serverHour : new Date().getUTCHours();
            document.querySelectorAll('.hour-badge').forEach((badge) => {
                const hv = parseInt(badge.dataset.hour, 10);
                const active = hv === h;
                badge.style.background = active ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.05)';
                badge.style.borderColor = active ? 'var(--accent-gold)' : 'var(--glass-border)';
                badge.style.color = active ? 'var(--accent-gold)' : 'var(--text-secondary)';
                badge.style.fontWeight = active ? '700' : '500';
                if (active) {
                    const det = badge.closest('details');
                    if (det) det.open = true;
                }
            });
        }
        highlightServerHour();
    }

    // 2. Exécution sécurisée de l'initialisation de l'UI
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
