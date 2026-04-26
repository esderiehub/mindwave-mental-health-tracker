var App = (function () {

    var upcomingMatches = [];
    var historyMatches  = [];
    var analyzedMatches = [];
    var matchMap        = {};

    function init() {
        console.log("SportAnaliz basliyor...");
        showMainLoader();

        Promise.all([
            ApiService.fetchAllLeagues(),
            ApiService.fetchAllHistory()
        ]).then(function (results) {
            upcomingMatches = results[0];
            historyMatches  = results[1];

            console.log("Upcoming:", upcomingMatches.length,
                        "| Gecmis:", historyMatches.length);

            // Analiz motoru çalıştır
            analyzedMatches = Analyzer.analyzeAll(upcomingMatches, historyMatches);

            // Map oluştur
            matchMap = {};
            analyzedMatches.forEach(function (m) { matchMap[m.id] = m; });

            // Render
            RenderService.renderOddsTable(analyzedMatches);
            RenderService.renderStats(upcomingMatches, historyMatches);
            updateLastUpdate();

        }).catch(function (err) {
            console.error("Yuklenemedi:", err);
            showError("Veriler yüklenemedi. Demo veri gösteriliyor.");

            // Demo fallback
            upcomingMatches = ApiService.getDemoUpcoming();
            historyMatches  = ApiService.getDemoHistory();
            analyzedMatches = Analyzer.analyzeAll(upcomingMatches, historyMatches);
            matchMap = {};
            analyzedMatches.forEach(function (m) { matchMap[m.id] = m; });
            RenderService.renderOddsTable(analyzedMatches);
            RenderService.renderStats(upcomingMatches, historyMatches);
            updateLastUpdate();
        });
    }

    function showAnalysis(matchId) {
        var match = matchMap[matchId];
        if (!match) return;
        RenderService.renderAnalysisModal(match);
    }

    function filterMatches() {
        var leagueEl = document.getElementById("leagueFilter");
        var statusEl = document.getElementById("statusFilter");
        var searchEl = document.getElementById("searchInput");

        var league = leagueEl ? leagueEl.value.toLowerCase() : "";
        var status = statusEl ? statusEl.value : "";
        var search = searchEl ? searchEl.value.toLowerCase() : "";

        var filtered = analyzedMatches.filter(function (m) {
            var lOk = !league ||
                m.leagueCode.toLowerCase().indexOf(league) > -1 ||
                m.league.toLowerCase().indexOf(league)     > -1;
            var sOk = !status || m.status === status;
            var qOk = !search ||
                m.home.toLowerCase().indexOf(search)   > -1 ||
                m.away.toLowerCase().indexOf(search)   > -1 ||
                m.league.toLowerCase().indexOf(search) > -1;
            return lOk && sOk && qOk;
        });

        RenderService.renderOddsTable(filtered);
    }

    function showMainLoader() {
        var tb = document.getElementById("oddsTableBody");
        if (tb) tb.innerHTML =
            "<tr><td colspan='10' style='text-align:center;padding:40px'>" +
            "<div class='loader'></div>" +
            "<p style='color:#aaa;margin-top:12px'>Veriler yükleniyor...</p>" +
            "</td></tr>";
    }

    function showError(msg) {
        var tb = document.getElementById("oddsTableBody");
        if (tb) tb.innerHTML =
            "<tr><td colspan='10' style='text-align:center;padding:40px;color:#ff6b6b'>" +
            "⚠️ " + msg + "</td></tr>";
    }

    function updateLastUpdate() {
        var el = document.getElementById("lastUpdate");
        if (el) el.textContent =
            "Son güncelleme: " +
            new Date().toLocaleTimeString("tr-TR",
                { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    }

    document.addEventListener("DOMContentLoaded", function () {
        init();

        var el;
        el = document.getElementById("leagueFilter");
        if (el) el.addEventListener("change", filterMatches);

        el = document.getElementById("statusFilter");
        if (el) el.addEventListener("change", filterMatches);

        el = document.getElementById("searchInput");
        if (el) el.addEventListener("input", filterMatches);

        el = document.getElementById("refreshBtn");
        if (el) el.addEventListener("click", init);

        setInterval(init, CONFIG.REFRESH);
    });

    return {
        init:         init,
        showAnalysis: showAnalysis,
        filterMatches: filterMatches
    };

})();
