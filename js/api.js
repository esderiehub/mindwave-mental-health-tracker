var ApiService = (function () {

    function fetchJSON(url) {
        return fetch(url)
            .then(function (res) {
                if (!res.ok) throw new Error("HTTP " + res.status);
                return res.json();
            })
            .catch(function (err) {
                console.warn("fetchJSON hata:", err.message, url);
                throw err;
            });
    }

    // ─── TEK LİG UPCOMING ───────────────────────────────────────
    function fetchSport(sportKey) {
        var url = CONFIG.ODDS_API_BASE
            + "/sports/" + sportKey + "/odds"
            + "?apiKey="     + CONFIG.ODDS_API_KEY
            + "&regions="    + CONFIG.REGIONS
            + "&markets="    + CONFIG.MARKETS
            + "&oddsFormat=decimal";

        return fetchJSON(url)
            .then(function (data) { return parseMatches(data, sportKey, "upcoming"); })
            .catch(function () { return []; });
    }

    // ─── TEK LİG GEÇMİŞ ─────────────────────────────────────────
    function fetchHistory(sportKey) {
        var url = CONFIG.ODDS_API_BASE
            + "/sports/" + sportKey + "/scores"
            + "?apiKey="    + CONFIG.ODDS_API_KEY
            + "&daysFrom="  + CONFIG.HISTORY_DAYS;

        return fetchJSON(url)
            .then(function (data) { return parseHistory(data, sportKey); })
            .catch(function () { return []; });
    }

    // ─── TÜM UPCOMING ───────────────────────────────────────────
    function fetchAllLeagues() {
        var promises = CONFIG.SPORTS.map(function (s) {
            return fetchSport(s);
        });
        return Promise.all(promises).then(function (results) {
            var all = [];
            results.forEach(function (r) { all = all.concat(r); });
            console.log("Upcoming mac:", all.length);
            if (all.length === 0) return getDemoUpcoming();
            return all;
        });
    }

    // ─── TÜM GEÇMİŞ ─────────────────────────────────────────────
    function fetchAllHistory() {
        var promises = CONFIG.SPORTS.map(function (s) {
            return fetchHistory(s);
        });
        return Promise.all(promises).then(function (results) {
            var all = [];
            results.forEach(function (r) { all = all.concat(r); });
            console.log("Gecmis mac:", all.length);
            if (all.length === 0) return getDemoHistory();
            return all;
        });
    }

    // ─── PARSE UPCOMING ─────────────────────────────────────────
    function parseMatches(data, sportKey, status) {
        if (!Array.isArray(data) || data.length === 0) return [];
        var matches = [];

        data.forEach(function (item) {
            if (!item.bookmakers || item.bookmakers.length === 0) return;

            var books  = [];
            var bMs1   = 0, bMsx = 0, bMs2 = 0;
            var totMs1 = 0, totMsx = 0, totMs2 = 0, cnt = 0;

            item.bookmakers.forEach(function (bm) {
                var ms1 = null, msx = null, ms2 = null;
                (bm.markets || []).forEach(function (mkt) {
                    if (mkt.key !== "h2h") return;
                    (mkt.outcomes || []).forEach(function (out) {
                        if (out.name === item.home_team)       ms1 = out.price;
                        else if (out.name === item.away_team)  ms2 = out.price;
                        else                                   msx = out.price;
                    });
                });
                if (!ms1 || !ms2) return;

                if (ms1 > bMs1) bMs1 = ms1;
                if (msx && msx > bMsx) bMsx = msx;
                if (ms2 > bMs2) bMs2 = ms2;

                totMs1 += ms1;
                totMsx += (msx || 0);
                totMs2 += ms2;
                cnt++;

                books.push({ name: bm.title, ms1: ms1, msx: msx, ms2: ms2 });
            });

            if (books.length === 0) return;

            var avgMs1 = cnt > 0 ? +(totMs1 / cnt).toFixed(2) : 0;
            var avgMsx = cnt > 0 ? +(totMsx / cnt).toFixed(2) : 0;
            var avgMs2 = cnt > 0 ? +(totMs2 / cnt).toFixed(2) : 0;

            var d = new Date(item.commence_time);

            matches.push({
                id:          item.id,
                league:      leagueName(sportKey),
                leagueCode:  sportKey,
                home:        item.home_team,
                away:        item.away_team,
                date:        d.toLocaleDateString("tr-TR"),
                time:        d.toLocaleTimeString("tr-TR",
                                 { hour: "2-digit", minute: "2-digit" }),
                commenceTime: item.commence_time,
                status:      status,
                bookmakers:  books,
                bestOdds:    { ms1: bMs1, msx: bMsx, ms2: bMs2 },
                avgOdds:     { ms1: avgMs1, msx: avgMsx, ms2: avgMs2 },
                openOdds:    { ms1: books[0].ms1,
                               msx: books[0].msx,
                               ms2: books[0].ms2 },
                closeOdds:   { ms1: books[books.length-1].ms1,
                               msx: books[books.length-1].msx,
                               ms2: books[books.length-1].ms2 },
                result:      null,
                scoreHome:   0,
                scoreAway:   0,
                similarMatches: []
            });
        });

        return matches;
    }

    // ─── PARSE GEÇMİŞ ───────────────────────────────────────────
    function parseHistory(data, sportKey) {
        if (!Array.isArray(data) || data.length === 0) return [];
        var matches = [];

        data.forEach(function (item) {
            if (!item.completed) return;

            var scoreHome = 0, scoreAway = 0;
            var result    = "X";

            if (item.scores && item.scores.length >= 2) {
                item.scores.forEach(function (s) {
                    var sc = parseInt(s.score) || 0;
                    if (s.name === item.home_team) scoreHome = sc;
                    else                           scoreAway = sc;
                });
                if (scoreHome > scoreAway)      result = "1";
                else if (scoreAway > scoreHome) result = "2";
                else                            result = "X";
            }

            var d = new Date(item.commence_time);

            // Scores API'den oran bilgisi gelmiyor, tahmini oluştur
            // Gerçek projede odds/history endpoint'i kullanılır
            matches.push({
                id:          item.id,
                league:      leagueName(sportKey),
                leagueCode:  sportKey,
                home:        item.home_team,
                away:        item.away_team,
                date:        d.toLocaleDateString("tr-TR"),
                time:        d.toLocaleTimeString("tr-TR",
                                 { hour: "2-digit", minute: "2-digit" }),
                commenceTime: item.commence_time,
                status:      "finished",
                scoreHome:   scoreHome,
                scoreAway:   scoreAway,
                result:      result,
                // Oran verisi scores endpointinde yok, demo ile doldur
                avgOdds:     generateEstimatedOdds(result),
                bookmakers:  [],
                similarMatches: []
            });
        });

        return matches;
    }

    // Sonuca göre tahmini oran üret (gerçek oran yoksa)
    function generateEstimatedOdds(result) {
        if (result === "1") return { ms1: 1.80 + Math.random()*0.6,
                                     msx: 3.20 + Math.random()*0.8,
                                     ms2: 3.80 + Math.random()*1.2 };
        if (result === "2") return { ms1: 3.80 + Math.random()*1.2,
                                     msx: 3.20 + Math.random()*0.8,
                                     ms2: 1.80 + Math.random()*0.6 };
        return { ms1: 2.80 + Math.random()*0.4,
                 msx: 2.90 + Math.random()*0.4,
                 ms2: 2.80 + Math.random()*0.4 };
    }

    // ─── LİG ADI ────────────────────────────────────────────────
    function leagueName(key) {
        var map = {
            "soccer_epl":                   "Premier League 🏴󠁧󠁢󠁥󠁮󠁧󠁿",
            "soccer_germany_bundesliga":     "Bundesliga 🇩🇪",
            "soccer_italy_serie_a":          "Serie A 🇮🇹",
            "soccer_spain_la_liga":          "La Liga 🇪🇸",
            "soccer_france_ligue_one":       "Ligue 1 🇫🇷",
            "soccer_turkey_super_league":    "Süper Lig 🇹🇷",
            "soccer_uefa_champs_league":     "Şampiyonlar Ligi 🏆",
            "soccer_uefa_europa_league":     "Avrupa Ligi 🌍",
            "soccer_netherlands_eredivisie": "Eredivisie 🇳🇱",
            "soccer_portugal_primeira_liga": "Primeira Liga 🇵🇹"
        };
        return map[key] || key;
    }

    // ─── DEMO UPCOMING ──────────────────────────────────────────
    function getDemoUpcoming() {
        var t = new Date().toLocaleDateString("tr-TR");
        return [
            { id:"u1", league:"Premier League 🏴󠁧󠁢󠁥󠁮󠁧󠁿", leagueCode:"soccer_epl",
              home:"Manchester City", away:"Arsenal",
              date:t, time:"18:30", status:"upcoming",
              avgOdds:{ms1:1.78,msx:3.65,ms2:4.75},
              bestOdds:{ms1:1.82,msx:3.70,ms2:4.90},
              openOdds:{ms1:1.80,msx:3.60,ms2:4.50},
              closeOdds:{ms1:1.75,msx:3.70,ms2:4.80},
              bookmakers:[
                {name:"Bet365",ms1:1.75,msx:3.70,ms2:4.80},
                {name:"Bwin",ms1:1.78,msx:3.65,ms2:4.70},
                {name:"Pinnacle",ms1:1.82,msx:3.55,ms2:4.90}
              ],
              result:null, scoreHome:0, scoreAway:0, similarMatches:[] },

            { id:"u2", league:"Süper Lig 🇹🇷", leagueCode:"soccer_turkey_super_league",
              home:"Galatasaray", away:"Fenerbahçe",
              date:t, time:"21:00", status:"upcoming",
              avgOdds:{ms1:1.95,msx:3.40,ms2:3.82},
              bestOdds:{ms1:2.00,msx:3.50,ms2:3.90},
              openOdds:{ms1:2.10,msx:3.20,ms2:3.50},
              closeOdds:{ms1:1.95,msx:3.40,ms2:3.80},
              bookmakers:[
                {name:"Bet365",ms1:1.95,msx:3.40,ms2:3.80},
                {name:"Bwin",ms1:1.90,msx:3.50,ms2:3.90},
                {name:"Unibet",ms1:2.00,msx:3.30,ms2:3.75}
              ],
              result:null, scoreHome:0, scoreAway:0, similarMatches:[] },

            { id:"u3", league:"La Liga 🇪🇸", leagueCode:"soccer_spain_la_liga",
              home:"Real Madrid", away:"Barcelona",
              date:t, time:"22:00", status:"upcoming",
              avgOdds:{ms1:2.05,msx:3.45,ms2:3.30},
              bestOdds:{ms1:2.10,msx:3.50,ms2:3.35},
              openOdds:{ms1:2.20,msx:3.30,ms2:3.10},
              closeOdds:{ms1:2.05,msx:3.45,ms2:3.30},
              bookmakers:[
                {name:"Bet365",ms1:2.05,msx:3.45,ms2:3.30},
                {name:"Bwin",ms1:2.10,msx:3.40,ms2:3.25},
                {name:"Betway",ms1:2.00,msx:3.50,ms2:3.35}
              ],
              result:null, scoreHome:0, scoreAway:0, similarMatches:[] },

            { id:"u4", league:"Bundesliga 🇩🇪", leagueCode:"soccer_germany_bundesliga",
              home:"Bayern Münih", away:"Dortmund",
              date:t, time:"20:30", status:"upcoming",
              avgOdds:{ms1:1.62,msx:3.85,ms2:5.50},
              bestOdds:{ms1:1.65,msx:3.90,ms2:5.60},
              openOdds:{ms1:1.65,msx:3.80,ms2:5.20},
              closeOdds:{ms1:1.60,msx:3.90,ms2:5.50},
              bookmakers:[
                {name:"Bet365",ms1:1.60,msx:3.90,ms2:5.50},
                {name:"Unibet",ms1:1.62,msx:3.85,ms2:5.40},
                {name:"Pinnacle",ms1:1.65,msx:3.80,ms2:5.60}
              ],
              result:null, scoreHome:0, scoreAway:0, similarMatches:[] },

            { id:"u5", league:"Serie A 🇮🇹", leagueCode:"soccer_italy_serie_a",
              home:"Juventus", away:"AC Milan",
              date:t, time:"19:45", status:"upcoming",
              avgOdds:{ms1:2.15,msx:3.25,ms2:3.40},
              bestOdds:{ms1:2.20,msx:3.30,ms2:3.45},
              openOdds:{ms1:2.30,msx:3.10,ms2:3.20},
              closeOdds:{ms1:2.15,msx:3.25,ms2:3.40},
              bookmakers:[
                {name:"Bet365",ms1:2.15,msx:3.25,ms2:3.40},
                {name:"Bwin",ms1:2.20,msx:3.20,ms2:3.35},
                {name:"Betway",ms1:2.10,msx:3.30,ms2:3.45}
              ],
              result:null, scoreHome:0, scoreAway:0, similarMatches:[] }
        ];
    }

    // ─── DEMO GEÇMİŞ ────────────────────────────────────────────
    function getDemoHistory() {
        return [
            { id:"h1", league:"Premier League 🏴󠁧󠁢󠁥󠁮󠁧󠁿", leagueCode:"soccer_epl",
              home:"Liverpool", away:"Chelsea", date:"20.04.2026", time:"16:00",
              status:"finished", scoreHome:2, scoreAway:1, result:"1",
              avgOdds:{ms1:1.90,msx:3.50,ms2:4.20}, bookmakers:[], similarMatches:[] },

            { id:"h2", league:"Premier League 🏴󠁧󠁢󠁥󠁮󠁧󠁿", leagueCode:"soccer_epl",
              home:"Man United", away:"Tottenham", date:"19.04.2026", time:"14:00",
              status:"finished", scoreHome:1, scoreAway:1, result:"X",
              avgOdds:{ms1:2.10,msx:3.30,ms2:3.60}, bookmakers:[], similarMatches:[] },

            { id:"h3", league:"La Liga 🇪🇸", leagueCode:"soccer_spain_la_liga",
              home:"Atletico Madrid", away:"Sevilla", date:"21.04.2026", time:"20:00",
              status:"finished", scoreHome:3, scoreAway:0, result:"1",
              avgOdds:{ms1:1.75,msx:3.60,ms2:5.00}, bookmakers:[], similarMatches:[] },

            { id:"h4", league:"Bundesliga 🇩🇪", leagueCode:"soccer_germany_bundesliga",
              home:"Leverkusen", away:"Frankfurt", date:"20.04.2026", time:"17:30",
              status:"finished", scoreHome:2, scoreAway:2, result:"X",
              avgOdds:{ms1:1.70,msx:3.70,ms2:5.20}, bookmakers:[], similarMatches:[] },

            { id:"h5", league:"Serie A 🇮🇹", leagueCode:"soccer_italy_serie_a",
              home:"Inter Milan", away:"Napoli", date:"22.04.2026", time:"21:45",
              status:"finished", scoreHome:1, scoreAway:2, result:"2",
              avgOdds:{ms1:2.00,msx:3.40,ms2:3.80}, bookmakers:[], similarMatches:[] },

            { id:"h6", league:"Süper Lig 🇹🇷", leagueCode:"soccer_turkey_super_league",
              home:"Beşiktaş", away:"Trabzonspor", date:"20.04.2026", time:"20:00",
              status:"finished", scoreHome:0, scoreAway:1, result:"2",
              avgOdds:{ms1:1.85,msx:3.40,ms2:4.50}, bookmakers:[], similarMatches:[] },

            { id:"h7", league:"Şampiyonlar Ligi 🏆", leagueCode:"soccer_uefa_champs_league",
              home:"Real Madrid", away:"PSG", date:"15.04.2026", time:"21:00",
              status:"finished", scoreHome:3, scoreAway:1, result:"1",
              avgOdds:{ms1:1.95,msx:3.60,ms2:4.10}, bookmakers:[], similarMatches:[] },

            { id:"h8", league:"Ligue 1 🇫🇷", leagueCode:"soccer_france_ligue_one",
              home:"Lyon", away:"Monaco", date:"19.04.2026", time:"21:00",
              status:"finished", scoreHome:2, scoreAway:2, result:"X",
              avgOdds:{ms1:2.40,msx:3.10,ms2:3.00}, bookmakers:[], similarMatches:[] },

            { id:"h9", league:"Premier League 🏴󠁧󠁢󠁥󠁮󠁧󠁿", leagueCode:"soccer_epl",
              home:"Newcastle", away:"Everton", date:"18.04.2026", time:"14:00",
              status:"finished", scoreHome:4, scoreAway:1, result:"1",
              avgOdds:{ms1:1.65,msx:3.80,ms2:5.50}, bookmakers:[], similarMatches:[] },

            { id:"h10", league:"Bundesliga 🇩🇪", leagueCode:"soccer_germany_bundesliga",
              home:"Stuttgart", away:"Wolfsburg", date:"21.04.2026", time:"15:30",
              status:"finished", scoreHome:1, scoreAway:0, result:"1",
              avgOdds:{ms1:2.20,msx:3.20,ms2:3.40}, bookmakers:[], similarMatches:[] }
        ];
    }

    return {
        fetchAllLeagues:  fetchAllLeagues,
        fetchAllHistory:  fetchAllHistory,
        getDemoUpcoming:  getDemoUpcoming,
        getDemoHistory:   getDemoHistory
    };

})();
