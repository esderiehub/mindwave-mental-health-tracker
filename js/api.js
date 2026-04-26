var ApiService = (function () {

    // ─── TEMEL FETCH ────────────────────────────────────────────
    function fetchJSON(url) {
        return fetch(url)
            .then(function (res) {
                if (!res.ok) throw new Error("HTTP " + res.status);
                return res.json();
            })
            .catch(function (err) {
                console.warn("fetchJSON hata:", url, err.message);
                throw err;
            });
    }

    // ─── TEK LİG ────────────────────────────────────────────────
    function fetchSport(sportKey) {
        var url = CONFIG.ODDS_API_BASE
            + "/sports/" + sportKey + "/odds"
            + "?apiKey="      + CONFIG.ODDS_API_KEY
            + "&regions="     + CONFIG.REGIONS
            + "&markets="     + CONFIG.MARKETS
            + "&oddsFormat=decimal";

        return fetchJSON(url)
            .then(function (data) {
                return parse(data, sportKey);
            })
            .catch(function () {
                return [];
            });
    }

    // ─── TÜM LİGLER ─────────────────────────────────────────────
    function fetchAllLeagues() {
        var promises = CONFIG.SPORTS.map(function (s) {
            return fetchSport(s);
        });

        return Promise.all(promises).then(function (results) {
            var all = [];
            results.forEach(function (r) { all = all.concat(r); });

            console.log("Toplam mac:", all.length);

            if (all.length === 0) {
                console.warn("API verisi yok, demo gosteriliyor.");
                return getDemoData();
            }
            return all;
        });
    }

    // ─── CANLI ──────────────────────────────────────────────────
    function fetchLiveMatches() {
        var url = CONFIG.ODDS_API_BASE
            + "/sports/soccer/scores"
            + "?apiKey="   + CONFIG.ODDS_API_KEY
            + "&daysFrom=1";

        return fetchJSON(url)
            .then(function (data) {
                if (!Array.isArray(data)) return [];
                return data
                    .filter(function (item) { return !item.completed; })
                    .map(function (item) {
                        var h = 0, a = 0;
                        if (item.scores) {
                            item.scores.forEach(function (s) {
                                if (s.name === item.home_team) h = s.score;
                                else a = s.score;
                            });
                        }
                        return {
                            id:         item.id,
                            league:     leagueName(item.sport_key),
                            leagueCode: item.sport_key,
                            home:       item.home_team,
                            away:       item.away_team,
                            scoreHome:  h,
                            scoreAway:  a,
                            minute:     null,
                            closeOdds:  null
                        };
                    });
            })
            .catch(function () { return []; });
    }

    // ─── PARSE ──────────────────────────────────────────────────
    function parse(data, sportKey) {
        if (!Array.isArray(data) || data.length === 0) return [];

        var matches = [];

        data.forEach(function (item) {
            if (!item.bookmakers || item.bookmakers.length === 0) return;

            var books = [];
            var bMs1 = 0, bMsx = 0, bMs2 = 0;

            item.bookmakers.forEach(function (bm) {
                var ms1 = null, msx = null, ms2 = null;

                (bm.markets || []).forEach(function (mkt) {
                    if (mkt.key !== "h2h") return;
                    (mkt.outcomes || []).forEach(function (out) {
                        if (out.name === item.home_team)      ms1 = out.price;
                        else if (out.name === item.away_team) ms2 = out.price;
                        else                                  msx = out.price;
                    });
                });

                if (!ms1 || !ms2) return;

                if (ms1 > bMs1) bMs1 = ms1;
                if (msx && msx > bMsx) bMsx = msx;
                if (ms2 > bMs2) bMs2 = ms2;

                books.push({ name: bm.title, ms1: ms1, msx: msx, ms2: ms2 });
            });

            if (books.length === 0) return;

            var d      = new Date(item.commence_time);
            var now    = new Date();

            matches.push({
                id:         item.id,
                league:     leagueName(sportKey),
                leagueCode: sportKey,
                home:       item.home_team,
                away:       item.away_team,
                date:       d.toLocaleDateString("tr-TR"),
                time:       d.toLocaleTimeString("tr-TR",
                                { hour: "2-digit", minute: "2-digit" }),
                status:     d > now ? "upcoming" : "finished",
                openOdds:  { ms1: books[0].ms1,
                              msx: books[0].msx,
                              ms2: books[0].ms2 },
                closeOdds: { ms1: books[books.length-1].ms1,
                              msx: books[books.length-1].msx,
                              ms2: books[books.length-1].ms2 },
                bookmakers: books,
                bestOdds:  { ms1: bMs1, msx: bMsx, ms2: bMs2 },
                scoreHome: 0,
                scoreAway: 0,
                minute:    null
            });
        });

        return matches;
    }

    // ─── LİG ADI ────────────────────────────────────────────────
    function leagueName(key) {
        var map = {
            "soccer_epl":                        "Premier League 🏴󠁧󠁢󠁥󠁮󠁧󠁿",
            "soccer_germany_bundesliga":          "Bundesliga 🇩🇪",
            "soccer_italy_serie_a":               "Serie A 🇮🇹",
            "soccer_spain_la_liga":               "La Liga 🇪🇸",
            "soccer_france_ligue_one":            "Ligue 1 🇫🇷",
            "soccer_turkey_super_league":         "Süper Lig 🇹🇷",
            "soccer_uefa_champs_league":          "Şampiyonlar Ligi 🏆",
            "soccer_uefa_europa_league":          "Avrupa Ligi 🌍",
            "soccer_netherlands_eredivisie":      "Eredivisie 🇳🇱",
            "soccer_portugal_primeira_liga":      "Primeira Liga 🇵🇹"
        };
        return map[key] || key;
    }

    // ─── DEMO ────────────────────────────────────────────────────
    function getDemoData() {
        var today = new Date().toLocaleDateString("tr-TR");
        return [
            {
                id:"d1", league:"Premier League 🏴󠁧󠁢󠁥󠁮󠁧󠁿",
                leagueCode:"soccer_epl",
                home:"Manchester City", away:"Arsenal",
                date: today, time:"18:30", status:"upcoming",
                openOdds: {ms1:1.80,msx:3.60,ms2:4.50},
                closeOdds:{ms1:1.75,msx:3.70,ms2:4.80},
                bookmakers:[
                    {name:"Bet365",  ms1:1.75,msx:3.70,ms2:4.80},
                    {name:"Bwin",    ms1:1.78,msx:3.65,ms2:4.70},
                    {name:"Pinnacle",ms1:1.82,msx:3.55,ms2:4.90}
                ],
                bestOdds:{ms1:1.82,msx:3.70,ms2:4.90},
                scoreHome:0,scoreAway:0,minute:null
            },
            {
                id:"d2", league:"Süper Lig 🇹🇷",
                leagueCode:"soccer_turkey_super_league",
                home:"Galatasaray", away:"Fenerbahçe",
                date: today, time:"21:00", status:"upcoming",
                openOdds: {ms1:2.10,msx:3.20,ms2:3.50},
                closeOdds:{ms1:1.95,msx:3.40,ms2:3.80},
                bookmakers:[
                    {name:"Bet365",ms1:1.95,msx:3.40,ms2:3.80},
                    {name:"Bwin",  ms1:1.90,msx:3.50,ms2:3.90},
                    {name:"Unibet",ms1:2.00,msx:3.30,ms2:3.75}
                ],
                bestOdds:{ms1:2.00,msx:3.50,ms2:3.90},
                scoreHome:0,scoreAway:0,minute:null
            },
            {
                id:"d3", league:"La Liga 🇪🇸",
                leagueCode:"soccer_spain_la_liga",
                home:"Real Madrid", away:"Barcelona",
                date: today, time:"22:00", status:"upcoming",
                openOdds: {ms1:2.20,msx:3.30,ms2:3.10},
                closeOdds:{ms1:2.05,msx:3.45,ms2:3.30},
                bookmakers:[
                    {name:"Bet365",ms1:2.05,msx:3.45,ms2:3.30},
                    {name:"Bwin",  ms1:2.10,msx:3.40,ms2:3.25},
                    {name:"Betway",ms1:2.00,msx:3.50,ms2:3.35}
                ],
                bestOdds:{ms1:2.10,msx:3.50,ms2:3.35},
                scoreHome:0,scoreAway:0,minute:null
            },
            {
                id:"d4", league:"Bundesliga 🇩🇪",
                leagueCode:"soccer_germany_bundesliga",
                home:"Bayern Münih", away:"Dortmund",
                date: today, time:"20:30", status:"upcoming",
                openOdds: {ms1:1.65,msx:3.80,ms2:5.20},
                closeOdds:{ms1:1.60,msx:3.90,ms2:5.50},
                bookmakers:[
                    {name:"Bet365",  ms1:1.60,msx:3.90,ms2:5.50},
                    {name:"Unibet",  ms1:1.62,msx:3.85,ms2:5.40},
                    {name:"Pinnacle",ms1:1.65,msx:3.80,ms2:5.60}
                ],
                bestOdds:{ms1:1.65,msx:3.90,ms2:5.60},
                scoreHome:0,scoreAway:0,minute:null
            },
            {
                id:"d5", league:"Serie A 🇮🇹",
                leagueCode:"soccer_italy_serie_a",
                home:"Juventus", away:"AC Milan",
                date: today, time:"19:45", status:"upcoming",
                openOdds: {ms1:2.30,msx:3.10,ms2:3.20},
                closeOdds:{ms1:2.15,msx:3.25,ms2:3.40},
                bookmakers:[
                    {name:"Bet365",ms1:2.15,msx:3.25,ms2:3.40},
                    {name:"Bwin",  ms1:2.20,msx:3.20,ms2:3.35},
                    {name:"Betway",ms1:2.10,msx:3.30,ms2:3.45}
                ],
                bestOdds:{ms1:2.20,msx:3.30,ms2:3.45},
                scoreHome:0,scoreAway:0,minute:null
            },
            {
                id:"d6", league:"Ligue 1 🇫🇷",
                leagueCode:"soccer_france_ligue_one",
                home:"PSG", away:"Marseille",
                date: today, time:"22:00", status:"upcoming",
                openOdds: {ms1:1.55,msx:4.00,ms2:6.00},
                closeOdds:{ms1:1.50,msx:4.20,ms2:6.50},
                bookmakers:[
                    {name:"Bet365",  ms1:1.50,msx:4.20,ms2:6.50},
                    {name:"Unibet",  ms1:1.52,msx:4.10,ms2:6.30},
                    {name:"Pinnacle",ms1:1.55,msx:4.00,ms2:6.60}
                ],
                bestOdds:{ms1:1.55,msx:4.20,ms2:6.60},
                scoreHome:0,scoreAway:0,minute:null
            }
        ];
    }

    // ─── PUBLIC ──────────────────────────────────────────────────
    return {
        fetchAllLeagues:  fetchAllLeagues,
        fetchLiveMatches: fetchLiveMatches,
        getDemoData:      getDemoData
    };

})();
