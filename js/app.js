var App = (function() {

    var allMatches = [];
    var matchMap   = {};

    function init() {
        console.log("SportAnaliz basliyor...");
        RenderService.showLoader("oddsTableBody");
        RenderService.showGridLoader("liveGrid");

        // Maçları yükle
        ApiService.fetchAllLeagues()
            .then(function(matches) {
                allMatches = matches;
                matchMap   = {};

                for (var i = 0; i < matches.length; i++) {
                    matchMap[matches[i].id] = matches[i];
                }

                console.log("Yuklenen mac sayisi:", matches.length);

                RenderService.renderOddsTable(matches);
                RenderService.renderBookmakerSelector(matches);

                if (matches.length > 0) {
                    RenderService.renderBookmakerTable(matches[0]);
                }

                RenderService.renderLastUpdate();
            })
            .catch(function(err) {
                console.error("Veri hatasi:", err);
                RenderService.showError("oddsTableBody",
                    "Veriler yuklenemedi. Lutfen sayfayi yenileyin.");
            });

        // Canlı maçları yükle
        ApiService.fetchLiveMatches()
            .then(function(live) {
                RenderService.renderLiveMatches(live);
            })
            .catch(function() {
                RenderService.renderLiveMatches([]);
            });
    }

    function showAnalysis(matchId) {
        var match = matchMap[matchId];
        if (!match) {
            console.error("Mac bulunamadi:", matchId);
            return;
        }
        RenderService.renderAnalysisModal(match);
    }

    function filterMatches() {
        var leagueEl = document.getElementById("leagueFilter");
        var statusEl = document.getElementById("statusFilter");
        var searchEl = document.getElementById("searchInput");

        var league = leagueEl ? leagueEl.value.toLowerCase() : "";
        var status = statusEl ? statusEl.value : "";
        var search = searchEl ? searchEl.value.toLowerCase() : "";

        var filtered = allMatches.filter(function(m) {
            var leagueOk = !league ||
                m.leagueCode.toLowerCase().indexOf(league) > -1 ||
                m.league.toLowerCase().indexOf(league)    > -1;

            var statusOk = !status || m.status === status;

            var searchOk = !search ||
                m.home.toLowerCase().indexOf(search)   > -1 ||
                m.away.toLowerCase().indexOf(search)   > -1 ||
                m.league.toLowerCase().indexOf(search) > -1;

            return leagueOk && statusOk && searchOk;
        });

        RenderService.renderOddsTable(filtered);
    }

    // Event listeners
    document.addEventListener("DOMContentLoaded", function() {
        init();

        var leagueFilter = document.getElementById("leagueFilter");
        var statusFilter = document.getElementById("statusFilter");
        var searchInput  = document.getElementById("searchInput");
        var refreshBtn   = document.getElementById("refreshBtn");

        if (leagueFilter) {
            leagueFilter.addEventListener("change", filterMatches);
        }
        if (statusFilter) {
            statusFilter.addEventListener("change", filterMatches);
        }
        if (searchInput) {
            searchInput.addEventListener("input", filterMatches);
        }
        if (refreshBtn) {
            refreshBtn.addEventListener("click", function() { init(); });
        }

        // Otomatik yenileme
        setInterval(function() { init(); }, CONFIG.REFRESH);
    });

    return {
        init:          init,
        showAnalysis:  showAnalysis,
        filterMatches: filterMatches
    };

})();
