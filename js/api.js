var ApiService = (function() {

    function fetchJSON(url) {
        return fetch(url)
            .then(function(res) {
                if (!res.ok) {
                    throw new Error("HTTP " + res.status);
                }

                // Kota bilgisi
                var used      = res.headers.get("x-requests-used")     || 0;
                var remaining = res.headers.get("x-requests-remaining") || 0;
                if (RenderService && RenderService.renderQuotaBar) {
                    RenderService.renderQuotaBar(used, remaining);
                }

                return res.json();
            });
    }

    // Tek lig için oran çek
    function fetchSport(sportKey) {
        var url = CONFIG.ODDS_API_BASE
            + "/sports/" + sportKey + "/odds"
            + "?apiKey="     + CONFIG.ODDS_API_KEY
            + "&regions="    + CONFIG.REGIONS
            + "&markets="    + CONFIG.MARKETS
            + "&oddsFormat=decimal";

        return fetchJSON(url)
            .then(function(data) {
                return parseSportData(data, sportKey);
            })
            .catch(function(err) {
                console.warn("fetchSport hatasi [" + sportKey + "]:", err.message);
                return [];
            });
    }

    // Tüm ligleri çek
    function fetchAllLeagues() {
        var promises = CONFIG.SPORTS.map(function(sport) {
            return fetchSport(sport);
        });

        return Promise.all(promises).then(function(results) {
            var all = [];
            for (var i = 0; i < results.length; i++) {
                all = all.concat(results[i]);
            }
            console.log("Toplam cekilen mac:", all.length);
            if (all.length === 0) {
                console.warn("Veri gelmedi, demo kullaniliyor.");
                return getDemoData();
            }
            return all;
        });
    }

    // Canlı maçlar
    function fetchLiveMatches() {
        var url = CONFIG.ODDS_API_BASE
            + "/sports/soccer/scores"
            + "?apiKey=" + CONFIG.ODDS_API_KEY
            + "&daysFrom=1";

        return fetchJSON(url)
            .then(function(data) {
                if (!data || !Array.isArray(data)) return [];
                var live = [];
                for (var i = 0; i < data.length; i++) {
                    var item = data[i];
                    if (!item.completed) {
                        live.push({
                            id:         item.id,
                            league:     formatLeagueName(item.sport_key),
                            leagueCode: item.sport_key,
                            home:       item.home_team,
                            away:       item.away_team,
                            scoreHome:  (item.scores && item.scores[0])
                                        ? item.scores[0].score : 0,
                            scoreAway:  (item.scores && item.scores[1])
                                        ? item.scores[1].score : 0,
                            minute:     null,
                            closeOdds:  null
                        });
                    }
                }
                return live;
            })
            .catch(function(err) {
                console.warn("Canli mac alinamadi:", err.message);
                return [];
            });
    }

    // Parse
    function parseSportData(data, sportKey) {
        if (!data || !Array.isArray(data) || data.length === 0) return [];

        var matches = [];

        for (var i = 0; i < data.length; i++) {
            var item = data[i];
            if (!item.bookmakers || item.bookmakers.length === 0) continue;

            var bookmakers = [];
            var bestMs1 = 0, bestMsx = 0, bestMs2 = 0;

            for (var j = 0; j < item.bookmakers.length; j++) {
                var bm   = item.bookmakers[j];
                var ms1  = null, msx = null, ms2 = null;

                for (var k = 0; k < bm.markets.length; k++) {
                    var mkt = bm.markets[k];
                    if (mkt.key !== "h2h") continue;

                    for (var m = 0; m < mkt.outcomes.length; m++) {
                        var out = mkt.outcomes[m];
                        if (out.name === item.home_team)       ms1 = out.price;
                        else if (out.name === item.away_team)  ms2 = out.price;
                        else                                   msx = out.price;
                    }
                }

                if (!ms1 || !ms2) continue;

                if (ms1 > bestMs1) bestMs1 = ms1;
                if (msx && msx > bestMsx) bestMsx = msx;
                if (ms2 > bestMs2) bestMs2 = ms2;

                bookmakers.push({
                    name:       bm.title,
                    ms1:        ms1,
                    msx:        msx,
                    ms2:        ms2,
                    lastUpdate: bm.last_update
                });
            }

            if (bookmakers.length === 0) continue;

            var openOdds = {
                ms1: bookmakers[0].ms1,
                msx: bookmakers[0].msx,
                ms2: bookmakers[0].ms2
            };
            var closeOdds = {
                ms1: bookmakers[bookmakers.length - 1].ms1,
                msx: bookmakers[bookmakers.length - 1].msx,
                ms2: bookmakers[bookmakers.length - 1].ms2
            };

            var d      = new Date(item.commence_time);
            var now    = new Date();
            var status = d > now ? "upcoming" : "finished";

            matches.push({
                id:         item.id,
                league:     formatLeagueName(sportKey),
                leagueCode: sportKey,
                home:       item.home_team,
                away:       item.away_team,
                date:       d.toLocaleDateString("tr-TR"),
                time:       d.toLocaleTimeString("tr-TR",
                                { hour: "2-digit", minute: "2-digit" }),
                status:     status,
                openOdds:   openOdds,
                closeOdds:  closeOdds,
                bookmakers: bookmakers,
                bestOdds: {
                    ms1: bestMs1,
                    msx: bestMsx,
                    ms2: bestMs2
                },
                scoreHome: 0,
                scoreAway: 0,
                minute:    null
            });
        }

        return matches;
    }

    function formatLeagueName(key) {
        var map = {
            "soccer_turkey_super_league":    "Supe Lig",
            "soccer_england_premier_league": "Premier League",
            "soccer_germany_bundesliga":     "Bundesliga",
            "soccer_italy_serie_a":          "Serie A",
            "soccer_spain_la_liga":          "La Liga",
            "soccer_france_ligue_one":       "Ligue 1",
            "soccer_uefa_champs_league":     "Sampiyonlar Ligi"
        };
        return map[key] || key;
    }

    // ========== DEMO VERİ ==========
    function getDemoData() {
        return [
            {
                id: "demo1",
                league: "Super Lig",
                leagueCode: "soccer_turkey_super_league",
                home: "Galatasaray", away: "Fenerbahce",
                date: new Date().toLocaleDateString("tr-TR"),
                time: "21:00", status: "upcoming",
                openOdds:  { ms1: 2.10, msx: 3.20, ms2: 3.50 },
                closeOdds: { ms1: 1.95, msx: 3.40, ms2: 3.80 },
                bookmakers: [
                    { name: "Bet365",   ms1: 1.95, msx: 3.40, ms2: 3.80 },
                    { name: "Bwin",     ms1: 1.90, msx: 3.50, ms2: 3.90 },
                    { name: "Unibet",   ms1: 2.00, msx: 3.30, ms2: 3.75 }
                ],
                bestOdds: { ms1: 2.00, msx: 3.50, ms2: 3.90 },
                scoreHome: 0, scoreAway: 0, minute: null
            },
            {
                id: "demo2",
                league: "Premier League",
                leagueCode: "soccer_england_premier_league",
                home: "Manchester City", away: "Arsenal",
                date: new Date().toLocaleDateString("tr-TR"),
                time: "18:30", status: "upcoming",
                openOdds:  { ms1: 1.80, msx: 3.60, ms2: 4.50 },
                closeOdds: { ms1: 1.75, msx: 3.70, ms2: 4.80 },
                bookmakers: [
                    { name: "Bet365",   ms1: 1.75, msx: 3.70, ms2: 4.80 },
                    { name: "Betfair",  ms1: 1.78, msx: 3.65, ms2: 4.70 },
                    { name: "Pinnacle", ms1: 1.82, msx: 3.55, ms2: 4.90 }
                ],
                bestOdds: { ms1: 1.82, msx: 3.70, ms2: 4.90 },
                scoreHome: 0, scoreAway: 0, minute: null
            },
            {
                id: "demo3",
                league: "La Liga",
                leagueCode: "soccer_spain_la_liga",
                home: "Real Madrid", away: "Barcelona",
                date: new Date().toLocaleDateString("tr-TR"),
                time: "22:00", status: "upcoming",
                openOdds:  { ms1: 2.20, msx: 3.30, ms2: 3.10 },
                closeOdds: { ms1: 2.05, msx: 3.45, ms2: 3.30 },
                bookmakers: [
                    { name: "Bet365",  ms1: 2.05, msx: 3.45, ms2: 3.30 },
                    { name: "Bwin",    ms1: 2.10, msx: 3.40, ms2: 3.25 },
                    { name: "Betway",  ms1: 2.00, msx: 3.50, ms2: 3.35 }
                ],
                bestOdds: { ms1: 2.10, msx: 3.50, ms2: 3.35 },
                scoreHome: 0, scoreAway: 0, minute: null
            },
            {
                id: "demo4",
                league: "Bundesliga",
                leagueCode: "soccer_germany_bundesliga",
                home: "Bayern Munih", away: "Borussia Dortmund",
                date: new Date().toLocaleDateString("tr-TR"),
                time: "20:30", status: "upcoming",
                openOdds:  { ms1: 1.65, msx: 3.80, ms2: 5.20 },
                closeOdds: { ms1: 1.60, msx: 3.90, ms2: 5.50 },
                bookmakers: [
                    { name: "Bet365",   ms1: 1.60, msx: 3.90, ms2: 5.50 },
                    { name: "Unibet",   ms1: 1.62, msx: 3.85, ms2: 5.40 },
                    { name: "Pinnacle", ms1: 1.65, msx: 3.80, ms2: 5.60 }
                ],
                bestOdds: { ms1: 1.65, msx: 3.90, ms2: 5.60 },
                scoreHome: 0, scoreAway: 0, minute: null
            },
            {
                id: "demo5",
                league: "Serie A",
                leagueCode: "soccer_italy_serie_a",
                home: "Juventus", away: "AC Milan",
                date: new Date().toLocaleDateString("tr-TR"),
                time: "19:45", status: "upcoming",
                openOdds:  { ms1: 2.30, msx: 3.10, ms2: 3.20 },
                closeOdds: { ms1: 2.15, msx: 3.25, ms2: 3.40 },
                bookmakers: [
                    { name: "Bet365",  ms1: 2.15, msx: 3.25, ms2: 3.40 },
                    { name: "Bwin",    ms1: 2.20, msx: 3.20, ms2: 3.35 },
                    { name: "Betway",  ms1: 2.10, msx: 3.30, ms2: 3.45 }
                ],
                bestOdds: { ms1: 2.20, msx: 3.30, ms2: 3.45 },
                scoreHome: 0, scoreAway: 0, minute: null
            },
            {
                id: "demo6",
                league: "Ligue 1",
                leagueCode: "soccer_france_ligue_one",
                home: "PSG", away: "Marseille",
                date: new Date().toLocaleDateString("tr-TR"),
                time: "22:00", status: "upcoming",
                openOdds:  { ms1: 1.55, msx: 4.00, ms2: 6.00 },
                closeOdds: { ms1: 1.50, msx: 4.20, ms2: 6.50 },
                bookmakers: [
                    { name: "Bet365",   ms1: 1.50, msx: 4.20, ms2: 6.50 },
                    { name: "Unibet",   ms1: 1.52, msx: 4.10, ms2: 6.30 },
                    { name: "Pinnacle", ms1: 1.55, msx: 4.00, ms2: 6.60 }
                ],
                bestOdds: { ms1: 1.55, msx: 4.20, ms2: 6.60 },
                scoreHome: 0, scoreAway: 0, minute: null
            }
        ];
    }

    return {
        fetchAllLeagues:  fetchAllLeagues,
        fetchLiveMatches: fetchLiveMatches,
        getDemoData:      getDemoData
    };

})();
