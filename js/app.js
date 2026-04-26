// ============================================================
//  ANA UYGULAMA
// ============================================================
const App = (() => {

    let state = {
        allMatches:      [],
        filteredMatches: [],
        liveMatches:     [],
        oddsTimer:       null,
        liveTimer:       null,
        isLoading:       false,
    };

    // ===== BAŞLAT =====
    async function init() {
        if (state.isLoading) return;
        state.isLoading = true;
        console.log("🚀 SportAnaliz başlatılıyor...");

        setDefaultDate();
        RenderService.showLoader("oddsTableBody");
        RenderService.showGridLoader("liveGrid");

        try {
            // Paralel veri çek
            const [merged, live] = await Promise.all([
                ApiService.getMergedData(),
                ApiService.getLiveMatches(),
            ]);

            state.allMatches      = merged;
            state.filteredMatches = merged;
            state.liveMatches     = buildLive(live, merged);

            // Ekrana çiz
            RenderService.renderOddsTable(state.filteredMatches);
            RenderService.renderBookmakerSelector(state.filteredMatches);
            RenderService.renderLiveMatches(state.liveMatches);
            RenderService.renderLastUpdate();

            if (state.filteredMatches.length > 0) {
                RenderService.renderBookmakerTable(state.filteredMatches[0]);
            }

            // Kota göster
            if (window._oddsQuota) {
                RenderService.renderQuotaBar(
                    window._oddsQuota.used,
                    window._oddsQuota.remaining
                );
            }

            startAutoRefresh();
            console.log(`✅ ${merged.length} maç yüklendi.`);

        } catch (err) {
            console.error("❌ Başlatma hatası:", err);
            RenderService.showError(
                "oddsTableBody",
                "Veriler yüklenemedi. API key'leri kontrol edin."
            );
            RenderService.showGridLoader("liveGrid");
        } finally {
            state.isLoading = false;
        }
    }

    // ===== CANLI MAÇ OLUŞTUR =====
    function buildLive(liveRaw, merged) {
        if (!liveRaw?.length) {
            return merged.filter(m => m.status === "live");
        }
        return liveRaw.map(m => {
            const name = (m.homeTeam?.shortName || m.homeTeam?.name || "").toLowerCase();
            const found = merged.find(md =>
                md.home.toLowerCase().includes(name.split(" ")[0])
            );
            return {
                id:         m.id,
                league:     m.competition?.name || "",
                leagueCode: m.competition?.code || "",
                home:       m.homeTeam?.shortName || m.homeTeam?.name || "?",
                away:       m.awayTeam?.shortName || m.awayTeam?.name || "?",
                scoreHome:  m.score?.fullTime?.home ?? m.score?.halfTime?.home ?? 0,
                scoreAway:  m.score?.fullTime?.away ?? m.score?.halfTime?.away ?? 0,
                minute:     m.minute || "?",
                status:     "live",
                closeOdds:  found?.closeOdds || null,
            };
        });
    }

    // ===== OTOMATİK YENİLEME =====
    function startAutoRefresh() {
        clearInterval(state.oddsTimer);
        clearInterval(state.liveTimer);

        // Oranları 60 sn'de bir güncelle
        state.oddsTimer = setInterval(async () => {
            try {
                const fresh = await ApiService.getMergedData();
                if (fresh?.length) {
                    state.allMatches = fresh;
                    applyFilters();
                    RenderService.renderLastUpdate();
                    if (window._oddsQuota) {
                        RenderService.renderQuotaBar(
                            window._oddsQuota.used,
                            window._oddsQuota.remaining
                        );
                    }
                }
            } catch (e) { console.warn("Oran güncelleme hatası:", e); }
        }, CONFIG.ODDS_REFRESH_MS);

        // Canlı maçları 30 sn'de bir güncelle
        state.liveTimer = setInterval(async () => {
            try {
                const live = await ApiService.getLiveMatches();
                state.liveMatches = buildLive(live, state.allMatches);
                RenderService.renderLiveMatches(state.liveMatches);
            } catch (e) { console.warn("Canlı güncelleme hatası:", e); }
        }, CONFIG.LIVE_REFRESH_MS);

        console.log("⏱️ Otomatik yenileme aktif.");
    }

    // ===== FİLTRELE =====
    function filterMatches() { applyFilters(); }

    function applyFilters() {
        const league = document.getElementById("leagueFilter")?.value || "all";
        const status = document.getElementById("statusFilter")?.value || "all";
        const date   = document.getElementById("dateFilter")?.value   || "";
        const search = document.getElementById("searchInput")?.value?.toLowerCase() || "";

        const leagueMap = {
            sl: "Süper Lig",
            pl: "Premier League",
            la: "Primera Division",
            bl: "Bundesliga",
            sa: "Serie A",
            cl: "UEFA Champions League",
            fl: "Ligue 1",
        };

        state.filteredMatches = state.allMatches.filter(m => {
            const lok = league === "all" || m.league === leagueMap[league];
            const sok = status === "all" || m.status === status;
            const dok = !date   || m.date === date;
            const qok = !search
                || m.home.toLowerCase().includes(search)
                || m.away.toLowerCase().includes(search)
                || m.league.toLowerCase().includes(search);
            return lok && sok && dok && qok;
        });

        RenderService.renderOddsTable(state.filteredMatches);
        RenderService.renderBookmakerSelector(state.filteredMatches);
        if (state.filteredMatches.length > 0) {
            RenderService.renderBookmakerTable(state.filteredMatches[0]);
        }
    }

    // ===== ANALİZ =====
    function showAnalysis(id) {
        const match = state.allMatches.find(m => String(m.id) === String(id));
        if (match) RenderService.renderAnalysisModal(match);
    }

    // ===== MODAL =====
    function openModal(id) {
        const m = document.getElementById(id);
        if (m) m.style.cssText = "display:flex;align-items:center;justify-content:center;";
    }
    function closeModal(id) {
        const m = document.getElementById(id);
        if (m) m.style.display = "none";
    }
    function switchModal(a, b) { closeModal(a); openModal(b); }

    // ===== PLAN =====
    function selectPlan(el) {
        document.querySelectorAll(".plan-card")
            .forEach(c => c.classList.remove("selected"));
        el.classList.add("selected");
    }

    // ===== BUGÜNÜN TARİHİ =====
    function setDefaultDate() {
        const el = document.getElementById("dateFilter");
        if (el) el.value = new Date().toISOString().split("T")[0];
    }

    // Modal dışına tıkla kapat
    window.addEventListener("click", e => {
        ["loginModal","registerModal"].forEach(id => {
            const m = document.getElementById(id);
            if (m && e.target === m) m.style.display = "none";
        });
    });

    // Sayfa yüklenince başlat
    document.addEventListener("DOMContentLoaded", init);

    return {
        init,
        filterMatches,
        showAnalysis,
        openModal,
        closeModal,
        switchModal,
        selectPlan,
        getState: () => state,
    };
})();
