var App = (function () {

    var allMatches = [];
    var matchMap   = {};

    function init() {
        console.log("SportAnaliz basliyor...");

        if (RenderService.showLoader)     RenderService.showLoader("oddsTableBody");
        if (RenderService.showGridLoader) RenderService.showGridLoader("liveGrid");

        ApiService.fetchAllLeagues()
            .then(function (matches) {
                allMatches = matches;
                matchMap   = {};
                matches.forEach(function (m) { matchMap[m.id] = m; });

                console.log("Yuklendi:", matches.length, "mac");

                RenderService.renderOddsTable(matches);

                if (RenderService.renderBookmakerSelector) {
                    RenderService.renderBookmakerSelector(matches);
                }
                if (matches.length > 0 && RenderService.renderBookmakerTable) {
                    RenderService.renderBookmakerTable(matches[0]);
                }
                if (RenderService.renderLastUpdate) {
                    RenderService.renderLastUpdate();
                }
            })
            .catch(function (err) {
                console.error("Yuklenemedi:", err);
                if (RenderService.showError) {
                    RenderService.showError("oddsTableBody",
                        "Veriler yuklenemedi. Sayfayi yenileyin.");
                }
            });

        ApiService.fetchLiveMatches()
            .then(function (live) {
                if (RenderService.renderLiveMatches) {
                    RenderService.renderLiveMatches(live);
                }
            })
            .catch(function () {
                if (RenderService.renderLiveMatches) {
                    RenderService.renderLiveMatches([]);
                }
            });
    }

    function showAnalysis(matchId) {
        var match = matchMap[matchId];
        if (!match) { console.error("Mac yok:", matchId); return; }
        if (RenderService.renderAnalysisModal) {
            RenderService.renderAnalysisModal(match);
        }
    }

    function filterMatches() {
        var leagueEl = document.getElementById("leagueFilter");
        var statusEl = document.getElementById("statusFilter");
        var searchEl = document.getElementById("searchInput");

        var league = leagueEl ? leagueEl.value.toLowerCase() : "";
        var status = statusEl ? statusEl.value : "";
        var search = searchEl ? searchEl.value.toLowerCase() : "";

        var filtered = allMatches.filter(function (m) {
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
        console.log("Otomatik yenileme aktif:", CONFIG.REFRESH / 1000, "sn");
    });

    return {
        init:          init,
        showAnalysis:  showAnalysis,
        filterMatches: filterMatches
    };

})();
