const RenderService = (function() {

    // ========== LOADER ==========
    function showLoader(id) {
        var el = document.getElementById(id);
        if (!el) return;
        el.innerHTML =
            '<tr><td colspan="12" style="text-align:center;padding:3rem;">' +
            '<div class="spinner"></div>' +
            '<p style="margin-top:1rem;color:var(--text-muted);">Veriler yukleniyor...</p>' +
            '</td></tr>';
    }

    function showGridLoader(id) {
        var el = document.getElementById(id);
        if (!el) return;
        el.innerHTML =
            '<div style="text-align:center;padding:3rem;grid-column:1/-1;">' +
            '<div class="spinner"></div>' +
            '<p style="margin-top:1rem;color:var(--text-muted);">Veriler yukleniyor...</p>' +
            '</div>';
    }

    function showError(id, msg) {
        var el = document.getElementById(id);
        if (!el) return;
        el.innerHTML =
            '<tr><td colspan="12" style="text-align:center;padding:3rem;color:var(--danger);">' +
            '<i class="fas fa-exclamation-triangle" style="font-size:2rem;"></i>' +
            '<p style="margin-top:1rem;">' + msg + '</p>' +
            '<button onclick="App.init()" style="margin-top:1rem;background:var(--primary);' +
            'color:var(--darker);border:none;padding:0.5rem 1.5rem;border-radius:8px;' +
            'cursor:pointer;font-weight:600;font-family:Inter,sans-serif;">Tekrar Dene</button>' +
            '</td></tr>';
    }

    // ========== ORAN TABLOSU ==========
    function renderOddsTable(matches) {
        var tbody = document.getElementById("oddsTableBody");
        if (!tbody) return;

        if (!matches || matches.length === 0) {
            tbody.innerHTML =
                '<tr><td colspan="12" style="text-align:center;padding:2rem;' +
                'color:var(--text-muted);">Bu kriterlere uygun mac bulunamadi.</td></tr>';
            return;
        }

        tbody.innerHTML = "";

        for (var i = 0; i < matches.length; i++) {
            var match = matches[i];
            if (!match.openOdds || !match.closeOdds) continue;

            var m1 = calcPct(match.openOdds.ms1, match.closeOdds.ms1);
            var mx = calcPct(match.openOdds.msx, match.closeOdds.msx);
            var m2 = calcPct(match.openOdds.ms2, match.closeOdds.ms2);
            var localTime = match.time ? utcToLocal(match.date, match.time) : "--:--";

            var tr = document.createElement("tr");
            tr.innerHTML =
                '<td>' +
                    '<span class="league-badge">' +
                        leagueEmoji(match.leagueCode) + " " + match.league +
                    '</span>' +
                '</td>' +
                '<td>' +
                    '<div class="match-teams">' +
                        '<span class="team-home">' + match.home + '</span>' +
                        '<span class="team-away">' + match.away + '</span>' +
                    '</div>' +
                '</td>' +
                '<td style="color:var(--text-muted);font-size:0.82rem;white-space:nowrap;">' +
                    '📅 ' + match.date + '<br>🕐 ' + localTime + ' (TR)' +
                '</td>' +
                '<td class="odd-open">' + fmt(match.openOdds.ms1) + '</td>' +
                '<td class="odd-open">' + fmt(match.openOdds.msx) + '</td>' +
                '<td class="odd-open">' + fmt(match.openOdds.ms2) + '</td>' +
                '<td class="odd-close">' + fmt(match.closeOdds.ms1) + '</td>' +
                '<td class="odd-close">' + fmt(match.closeOdds.msx) + '</td>' +
                '<td class="odd-close">' + fmt(match.closeOdds.ms2) + '</td>' +
                '<td>' + moveHtml(m1, mx, m2) + '</td>' +
                '<td>' +
                    '<span class="status-badge status-' + match.status + '">' +
                        statusLabel(match.status) +
                    '</span>' +
                '</td>' +
                '<td>' +
                    '<button class="btn-analyze" onclick="App.showAnalysis(\'' +
                        match.id + '\')">🔍 Analiz</button>' +
                '</td>';

            tbody.appendChild(tr);
        }
    }

    // ========== BOOKMAKER TABLOSU ==========
    function renderBookmakerTable(match) {
        var tbody = document.getElementById("bookmakerTableBody");
        if (!tbody) return;

        if (!match || !match.bookmakers || match.bookmakers.length === 0) {
            tbody.innerHTML =
                '<tr><td colspan="9" style="text-align:center;padding:1.5rem;' +
                'color:var(--text-muted);">Bu mac icin sirket verisi bulunamadi.</td></tr>';
            return;
        }

        var best = match.bestOdds || {};
        tbody.innerHTML = "";

        for (var i = 0; i < match.bookmakers.length; i++) {
            var bm     = match.bookmakers[i];
            var margin = calcMargin(bm.ms1, bm.msx, bm.ms2);
            var mClass = margin < 5 ? "margin-low" : margin < 7 ? "margin-mid" : "margin-high";

            var ms1Class = (bm.ms1 && best.ms1 && parseFloat(bm.ms1) >= parseFloat(best.ms1))
                           ? "best-odd" : "";
            var msxClass = (bm.msx && best.msx && parseFloat(bm.msx) >= parseFloat(best.msx))
                           ? "best-odd" : "";
            var ms2Class = (bm.ms2 && best.ms2 && parseFloat(bm.ms2) >= parseFloat(best.ms2))
                           ? "best-odd" : "";

            var updatedAt = bm.lastUpdate
                ? new Date(bm.lastUpdate).toLocaleTimeString("tr-TR",
                    { hour: "2-digit", minute: "2-digit" })
                : "-";

            var tr = document.createElement("tr");
            tr.innerHTML =
                '<td>' +
                    '<div class="bm-name">' +
                        '<div class="bm-logo" style="background:' + strColor(bm.name) + '">' +
                            bm.name.substring(0, 2).toUpperCase() +
                        '</div>' +
                        '<span>' + bm.name + '</span>' +
                        '<small style="color:var(--text-muted);font-size:0.7rem;">' +
                            updatedAt +
                        '</small>' +
                    '</div>' +
                '</td>' +
                '<td><span class="' + ms1Class + '">' + fmt(bm.ms1) + '</span></td>' +
                '<td><span class="' + msxClass + '">' + fmt(bm.msx) + '</span></td>' +
                '<td><span class="' + ms2Class + '">' + fmt(bm.ms2) + '</span></td>' +
                '<td style="color:var(--text-muted)">-</td>' +
                '<td style="color:var(--text-muted)">-</td>' +
                '<td style="color:var(--text-muted)">-</td>' +
                '<td style="color:var(--text-muted)">-</td>' +
                '<td><span class="' + mClass + '">' + margin + '%</span></td>';

            tbody.appendChild(tr);
        }
    }

    // ========== BOOKMAKER SELECTOR ==========
    function renderBookmakerSelector(matches) {
        var sel = document.querySelector(".bookmaker-selector");
        if (!sel || !matches || matches.length === 0) return;
        sel.innerHTML = "";

        var limit = Math.min(matches.length, 6);
        for (var i = 0; i < limit; i++) {
            (function(match, index) {
                var btn = document.createElement("button");
                btn.className = "bm-btn" + (index === 0 ? " active" : "");
                btn.textContent = match.home + " - " + match.away;
                btn.onclick = function() {
                    var all = sel.querySelectorAll(".bm-btn");
                    for (var j = 0; j < all.length; j++) {
                        all[j].classList.remove("active");
                    }
                    btn.classList.add("active");
                    renderBookmakerTable(match);
                };
                sel.appendChild(btn);
            })(matches[i], i);
        }
    }

    // ========== CANLI MACLAR ==========
    function renderLiveMatches(matches) {
        var grid = document.getElementById("liveGrid");
        if (!grid) return;

        if (!matches || matches.length === 0) {
            grid.innerHTML =
                '<div style="text-align:center;padding:2rem;' +
                'color:var(--text-muted);grid-column:1/-1;">' +
                '🔇 Su anda canli mac bulunmuyor.</div>';
            return;
        }

        grid.innerHTML = "";

        for (var i = 0; i < matches.length; i++) {
            var match = matches[i];
            var card  = document.createElement("div");
            card.className = "live-card";
            var min = match.minute ? match.minute + "'" : "🔴 Canli";

            var oddsHtml = "";
            if (match.closeOdds) {
                oddsHtml =
                    '<div class="live-odd-btn">' +
                        '<span class="live-odd-label">MS1</span>' +
                        '<span class="live-odd-val">' + fmt(match.closeOdds.ms1) + '</span>' +
                    '</div>' +
                    '<div class="live-odd-btn">' +
                        '<span class="live-odd-label">MSX</span>' +
                        '<span class="live-odd-val">' + fmt(match.closeOdds.msx) + '</span>' +
                    '</div>' +
                    '<div class="live-odd-btn">' +
                        '<span class="live-odd-label">MS2</span>' +
                        '<span class="live-odd-val">' + fmt(match.closeOdds.ms2) + '</span>' +
                    '</div>';
            } else {
                oddsHtml =
                    '<span style="color:var(--text-muted);font-size:0.8rem;' +
                    'text-align:center;width:100%;">Oran bekleniyor...</span>';
            }

            card.innerHTML =
                '<div class="live-card-header">' +
                    '<span class="live-league">' +
                        leagueEmoji(match.leagueCode) + " " + match.league +
                    '</span>' +
                    '<span class="live-time">' + min + '</span>' +
                '</div>' +
                '<div class="live-match">' +
                    '<span class="live-team">' + match.home + '</span>' +
                    '<span class="live-score">' +
                        match.scoreHome + ' - ' + match.scoreAway +
                    '</span>' +
                    '<span class="live-team">' + match.away + '</span>' +
                '</div>' +
                '<div class="live-odds-row">' + oddsHtml + '</div>';

            grid.appendChild(card);
        }
    }

    // ========== ANALIZ MODALI ==========
    function renderAnalysisModal(match) {
        var existing = document.getElementById("analysisModal");
        if (existing) existing.remove();

        if (!match.openOdds || !match.closeOdds) {
            alert("Bu mac icin oran verisi bulunamadi.");
            return;
        }

        var keys   = ["ms1", "msx", "ms2"];
        var labels = ["MS1 (Ev)", "MSX (Beraberlik)", "MS2 (Deplasman)"];
        var oddsCards = "";

        for (var i = 0; i < keys.length; i++) {
            var k     = keys[i];
            var open  = match.openOdds[k];
            var close = match.closeOdds[k];
            if (!open || !close) continue;

            var pct   = calcPct(open, close);
            var color = pct < -1 ? "var(--success)" : pct > 1 ? "var(--danger)" : "var(--warning)";
            var arrow = pct < -1 ? "▼" : pct > 1 ? "▲" : "→";

            oddsCards +=
                '<div style="background:var(--secondary);border-radius:10px;' +
                'padding:1rem;text-align:center;border:1px solid var(--border);">' +
                    '<div style="font-size:0.75rem;color:var(--text-muted);' +
                    'margin-bottom:0.4rem;">' + labels[i] + '</div>' +
                    '<div style="font-size:0.85rem;color:#3498db;">' +
                        'Acilis: <b>' + fmt(open) + '</b>' +
                    '</div>' +
                    '<div style="font-size:0.85rem;color:var(--primary);">' +
                        'Kapanis: <b>' + fmt(close) + '</b>' +
                    '</div>' +
                    '<div style="font-size:1rem;font-weight:700;color:' + color + ';' +
                    'margin-top:0.4rem;">' +
                        arrow + ' ' + Math.abs(pct) + '%' +
                    '</div>' +
                '</div>';
        }

        var m1 = calcPct(match.openOdds.ms1, match.closeOdds.ms1);
        var m2 = calcPct(match.openOdds.ms2, match.closeOdds.ms2);
        var signal = "Belirgin bir oran hareketi gozlemlenmiyor.";
        var sColor = "var(--warning)";

        if (m1 < -3) {
            signal = "Ev sahibi orani dustu - Ev sahibi yonunde ciddi para akisi!";
            sColor = "var(--success)";
        } else if (m2 < -3) {
            signal = "Deplasman orani dustu - Deplasman yonunde ciddi para akisi!";
            sColor = "var(--danger)";
        } else if (m1 < -1) {
            signal = "Ev sahibi orani hafif dustu - Hafif ev sahibi egilimi.";
            sColor = "var(--success)";
        } else if (m2 < -1) {
            signal = "Deplasman orani hafif dustu - Hafif deplasman egilimi.";
            sColor = "var(--danger)";
        } else if (m1 > 3) {
            signal = "Ev sahibi orani yukseldi - Ev sahibinden uzaklesma var.";
            sColor = "var(--warning)";
        }

        var bmRows = "";
        if (match.bookmakers && match.bookmakers.length > 0) {
            for (var j = 0; j < match.bookmakers.length; j++) {
                var bm  = match.bookmakers[j];
                var mg  = calcMargin(bm.ms1, bm.msx, bm.ms2);
                var mgC = mg < 5 ? "var(--success)" : mg < 7 ? "var(--warning)" : "var(--danger)";

                var ms1C  = (match.bestOdds && bm.ms1 === match.bestOdds.ms1)
                            ? "var(--primary)" : "var(--text)";
                var ms1FW = (match.bestOdds && bm.ms1 === match.bestOdds.ms1) ? "700" : "400";
                var ms2C  = (match.bestOdds && bm.ms2 === match.bestOdds.ms2)
                            ? "var(--primary)" : "var(--text)";
                var ms2FW = (match.bestOdds && bm.ms2 === match.bestOdds.ms2) ? "700" : "400";

                bmRows +=
                    '<tr style="border-bottom:1px solid var(--border);">' +
                        '<td style="padding:0.4rem 0.75rem;font-size:0.82rem;">' +
                            '<div style="display:flex;align-items:center;gap:0.4rem;">' +
                                '<div style="width:20px;height:20px;border-radius:4px;' +
                                'background:' + strColor(bm.name) + ';display:flex;' +
                                'align-items:center;justify-content:center;' +
                                'font-size:0.6rem;font-weight:700;color:#fff;">' +
                                    bm.name.substring(0, 2).toUpperCase() +
                                '</div>' +
                                bm.name +
                            '</div>' +
                        '</td>' +
                        '<td style="text-align:center;padding:0.4rem;font-size:0.85rem;' +
                        'color:' + ms1C + ';font-weight:' + ms1FW + ';">' +
                            fmt(bm.ms1) +
                        '</td>' +
                        '<td style="text-align:center;padding:0.4rem;font-size:0.85rem;' +
                        'color:var(--text);">' +
                            fmt(bm.msx) +
                        '</td>' +
                        '<td style="text-align:center;padding:0.4rem;font-size:0.85rem;' +
                        'color:' + ms2C + ';font-weight:' + ms2FW + ';">' +
                            fmt(bm.ms2) +
                        '</td>' +
                        '<td style="text-align:center;padding:0.4rem;font-size:0.82rem;' +
                        'color:' + mgC + ';">' +
                            mg + '%' +
                        '</td>' +
                    '</tr>';
            }
        }

        var bmTableHtml = "";
        if (bmRows) {
            bmTableHtml =
                '<div style="margin-bottom:1rem;">' +
                    '<div style="font-size:0.85rem;color:var(--text-muted);' +
                    'margin-bottom:0.5rem;">🏢 Bahis Sirketi Karsilastirmasi</div>' +
                    '<div style="overflow-x:auto;border-radius:8px;' +
                    'border:1px solid var(--border);">' +
                        '<table style="width:100%;border-collapse:collapse;' +
                        'background:var(--card);">' +
                            '<thead>' +
                                '<tr style="background:var(--secondary);">' +
                                    '<th style="padding:0.5rem 0.75rem;text-align:left;' +
                                    'font-size:0.75rem;color:var(--text-muted);">Sirket</th>' +
                                    '<th style="padding:0.5rem;text-align:center;' +
                                    'font-size:0.75rem;color:var(--text-muted);">MS1</th>' +
                                    '<th style="padding:0.5rem;text-align:center;' +
                                    'font-size:0.75rem;color:var(--text-muted);">MSX</th>' +
                                    '<th style="padding:0.5rem;text-align:center;' +
                                    'font-size:0.75rem;color:var(--text-muted);">MS2</th>' +
                                    '<th style="padding:0.5rem;text-align:center;' +
                                    'font-size:0.75rem;color:var(--text-muted);">Marj</th>' +
                                '</tr>' +
                            '</thead>' +
                            '<tbody>' + bmRows + '</tbody>' +
                        '</table>' +
                    '</div>' +
                '</div>';
        }

        var modal = document.createElement("div");
        modal.id = "analysisModal";
        modal.className = "modal";
        modal.style.cssText =
            "display:flex;align-items:center;justify-content:center;";

        modal.innerHTML =
            '<div class="modal-content" style="max-width:600px;">' +
                '<div class="modal-header">' +
                    '<h3>🔍 Oran Analizi</h3>' +
                    '<span class="close" ' +
                    'onclick="document.getElementById(\'analysisModal\').remove()">' +
                        '&times;' +
                    '</span>' +
                '</div>' +
                '<div class="modal-body">' +
                    '<div style="text-align:center;margin-bottom:1.5rem;">' +
                        '<div style="font-size:1.2rem;font-weight:700;color:var(--text);">' +
                            match.home +
                            '<span style="color:var(--primary);"> vs </span>' +
                            match.away +
                        '</div>' +
                        '<div style="font-size:0.85rem;color:var(--text-muted);' +
                        'margin-top:0.25rem;">' +
                            match.league + " - " + match.date +
                        '</div>' +
                    '</div>' +
                    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;' +
                    'gap:0.75rem;margin-bottom:1.5rem;">' +
                        oddsCards +
                    '</div>' +
                    '<div style="background:var(--secondary);border-radius:10px;' +
                    'padding:1rem;border-left:4px solid ' + sColor + ';' +
                    'margin-bottom:1rem;">' +
                        '<div style="font-size:0.78rem;color:var(--text-muted);' +
                        'margin-bottom:0.3rem;">📊 ORAN HAREKETI SINYALI</div>' +
                        '<div style="font-size:0.95rem;font-weight:600;' +
                        'color:' + sColor + ';">' + signal + '</div>' +
                    '</div>' +
                    bmTableHtml +
                    '<div style="padding:0.75rem;background:rgba(255,165,2,0.08);' +
                    'border-radius:8px;border:1px solid rgba(255,165,2,0.2);">' +
                        '<div style="font-size:0.75rem;color:var(--warning);">' +
                            '⚠️ Bu analiz yalnizca bilgi amaçlidir. ' +
                            'Karar sorumlulugu tamamen kullaniciya aittir.' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>';

        document.body.appendChild(modal);
        modal.addEventListener("click", function(e) {
            if (e.target === modal) modal.remove();
        });
    }

    // ========== KOTA BARI ==========
    function renderQuotaBar(used, remaining) {
        var total = parseInt(used) + parseInt(remaining);
        var pct   = Math.round((parseInt(used) / total) * 100);
        var color = pct > 80 ? "var(--danger)"
                  : pct > 50 ? "var(--warning)"
                  : "var(--success)";

        var bar = document.getElementById("quotaBar");
        if (!bar) {
            bar = document.createElement("div");
            bar.id = "quotaBar";
            document.body.appendChild(bar);
        }

        bar.innerHTML =
            '<div style="display:flex;justify-content:space-between;' +
            'margin-bottom:0.4rem;">' +
                '<span>📊 API Kotasi</span>' +
                '<span style="color:' + color + ';">' + used + ' / ' + total + '</span>' +
            '</div>' +
            '<div style="background:var(--border);border-radius:3px;' +
            'height:5px;overflow:hidden;">' +
                '<div style="width:' + pct + '%;height:100%;background:' + color + ';' +
                'border-radius:3px;transition:width 0.5s;"></div>' +
            '</div>' +
            '<div style="margin-top:0.3rem;color:' + color + ';font-size:0.75rem;">' +
                remaining + ' istek kaldi' +
            '</div>';
    }

    // ========== SON GUNCELLEME ==========
    function renderLastUpdate() {
        var el = document.getElementById("lastUpdate");
        if (!el) {
            el = document.createElement("div");
            el.id = "lastUpdate";
            var sec = document.querySelector(".odds-section");
            if (sec) sec.appendChild(el);
        }
        el.innerHTML = "🔄 Son guncelleme: " +
            new Date().toLocaleString("tr-TR");
    }

    // ========== YARDIMCI FONKSIYONLAR ==========
    function calcPct(open, close) {
        if (!open || !close) return 0;
        return parseFloat(((close - open) / open * 100).toFixed(1));
    }

    function calcMargin(ms1, msx, ms2) {
        var i1 = ms1 ? 1 / ms1 : 0;
        var ix = msx ? 1 / msx : 0;
        var i2 = ms2 ? 1 / ms2 : 0;
        return parseFloat(((i1 + ix + i2 - 1) * 100).toFixed(1));
    }

    function fmt(val) {
        if (!val) return "-";
        return parseFloat(val).toFixed(2);
    }

    function moveHtml(m1, mx, m2) {
        function a(v) {
            if (v < -1) return '<span class="movement-up">▼ ' + Math.abs(v) + '%</span>';
            if (v >  1) return '<span class="movement-down">▲ ' + Math.abs(v) + '%</span>';
            return '<span class="movement-neutral">→ ' + Math.abs(v) + '%</span>';
        }
        return '<div style="display:flex;flex-direction:column;gap:2px;font-size:0.78rem;">' +
               '<span>1: ' + a(m1) + '</span>' +
               '<span>X: ' + a(mx) + '</span>' +
               '<span>2: ' + a(m2) + '</span>' +
               '</div>';
    }

    function statusLabel(s) {
        if (s === "upcoming") return "⏳ Yaklasan";
        if (s === "live")     return "🔴 Canli";
        if (s === "finished") return "✅ Bitti";
        return s;
    }

    function leagueEmoji(code) {
        var map = {
            PL: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
            BL1: "🇩🇪",
            SA: "🇮🇹",
            PD: "🇪🇸",
            FL1: "🇫🇷",
            CL: "🏆",
            SL: "🇹🇷"
        };
        return map[code] || "⚽";
    }

    function strColor(str) {
        var h = 0;
        for (var i = 0; i < str.length; i++) {
            h = str.charCodeAt(i) + ((h << 5) - h);
        }
        return "hsl(" + (h % 360) + ",55%,35%)";
    }

    function utcToLocal(date, time) {
        try {
            var dt = new Date(date + "T" + time + ":00Z");
            return dt.toLocaleTimeString("tr-TR", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Europe/Istanbul"
            });
        } catch(e) {
            return time;
        }
    }

    // ========== PUBLIC ==========
    return {
        showLoader:              showLoader,
        showGridLoader:          showGridLoader,
        showError:               showError,
        renderOddsTable:         renderOddsTable,
        renderBookmakerTable:    renderBookmakerTable,
        renderBookmakerSelector: renderBookmakerSelector,
        renderLiveMatches:       renderLiveMatches,
        renderAnalysisModal:     renderAnalysisModal,
        renderQuotaBar:          renderQuotaBar,
        renderLastUpdate:        renderLastUpdate
    };

})();
