// ============================================================
//  API SERVİSİ - Tüm API çağrıları burada
// ============================================================

const ApiService = (() => {

    // ---------- YARDIMCI ----------
    async function fetchJSON(url, headers = {}) {
        try {
            const res = await fetch(url, { headers });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            return await res.json();
        } catch (err) {
            console.error("API Hatası:", err.message);
            return null;
        }
    }

    // ======================================================
    //  FOOTBALL-DATA.ORG  →  Maç Fikstürü & Sonuçları
    // ======================================================

    // Bugünkü ve yaklaşan maçları getir
    async function getMatches(leagueId) {
        const today = new Date();
        const from  = today.toISOString().split("T")[0];
        const toDate = new Date(today);
        toDate.setDate(today.getDate() + 7);
        const to = toDate.toISOString().split("T")[0];

        const url = `${CONFIG.FOOTBALL_BASE_URL}/competitions/${leagueId}/matches` +
                    `?dateFrom=${from}&dateTo=${to}&status=SCHEDULED,LIVE,IN_PLAY`;

        const data = await fetchJSON(url, {
            "X-Auth-Token": CONFIG.FOOTBALL_DATA_KEY
        });
        return data?.matches || [];
    }

    // Tüm liglerin maçlarını getir
    async function getAllMatches() {
        const promises = Object.values(CONFIG.LEAGUES).map(id => getMatches(id));
        const results  = await Promise.all(promises);
        return results.flat();
    }

    // Canlı maçları getir
    async function getLiveMatches() {
        const url = `${CONFIG.FOOTBALL_BASE_URL}/matches?status=IN_PLAY,LIVE`;
        const data = await fetchJSON(url, {
            "X-Auth-Token": CONFIG.FOOTBALL_DATA_KEY
        });
        return data?.matches || [];
    }

    // Takım istatistiklerini getir
    async function getTeamStats(teamId) {
        const url = `${CONFIG.FOOTBALL_BASE_URL}/teams/${teamId}/matches?limit=5&status=FINISHED`;
        const data = await fetchJSON(url, {
            "X-Auth-Token": CONFIG.FOOTBALL_DATA_KEY
        });
        return data?.matches || [];
    }

    // Puan tablosunu getir
    async function getStandings(leagueId) {
        const url = `${CONFIG.FOOTBALL_BASE_URL}/competitions/${leagueId}/standings`;
        const data = await fetchJSON(url, {
            "X-Auth-Token": CONFIG.FOOTBALL_DATA_KEY
        });
        return data?.standings?.[0]?.table || [];
    }

    // ======================================================
    //  THE ODDS API  →  Açılış / Kapanış Oranları
    // ======================================================

    // Tüm futbol liglerinin oranlarını getir
    async function getOdds(sportKey = CONFIG.SPORT_KEY) {
        const url = `${CONFIG.ODDS_BASE_URL}/sports/${sportKey}/odds` +
                    `?apiKey=${CONFIG.ODDS_API_KEY}` +
                    `&regions=${CONFIG.REGIONS}` +
                    `&markets=h2h,totals` +
                    `&oddsFormat=${CONFIG.ODDS_FORMAT}` +
                    `&dateFormat=iso`;

        const data = await fetchJSON(url);
        return data || [];
    }

    // Belirli bir maçın geçmiş/kapanış oranlarını getir
    async function getHistoricalOdds(eventId, sportKey = CONFIG.SPORT_KEY) {
        const url = `${CONFIG.ODDS_BASE_URL}/sports/${sportKey}/events/${eventId}/odds` +
                    `?apiKey=${CONFIG.ODDS_API_KEY}` +
                    `&regions=${CONFIG.REGIONS}` +
                    `&markets=h2h` +
                    `&oddsFormat=${CONFIG.ODDS_FORMAT}`;

        const data = await fetchJSON(url);
        return data || null;
    }

    // Canlı maç oranlarını getir
    async function getLiveOdds() {
        const url = `${CONFIG.ODDS_BASE_URL}/sports/${CONFIG.SPORT_KEY}/odds-live` +
                    `?apiKey=${CONFIG.ODDS_API_KEY}` +
                    `&regions=${CONFIG.REGIONS}` +
                    `&markets=h2h` +
                    `&oddsFormat=${CONFIG.ODDS_FORMAT}`;

        const data = await fetchJSON(url);
        return data || [];
    }

    // Desteklenen sporlara ait ligleri getir
    async function getSports() {
        const url = `${CONFIG.ODDS_BASE_URL}/sports` +
                    `?apiKey=${CONFIG.ODDS_API_KEY}&all=false`;
        const data = await fetchJSON(url);
        return data || [];
    }

    // Kalan API kredisini konsola yaz
    async function checkOddsApiQuota() {
        const url = `${CONFIG.ODDS_BASE_URL}/sports` +
                    `?apiKey=${CONFIG.ODDS_API_KEY}`;
        const res = await fetch(url);
        const remaining = res.headers.get("x-requests-remaining");
        const used      = res.headers.get("x-requests-used");
        console.info(`📊 Odds API Kredisi → Kullanılan: ${used} | Kalan: ${remaining}`);
        return { remaining, used };
    }

    // ======================================================
    //  VERİ BİRLEŞTİRME  →  Maç + Oran eşleştir
    // ======================================================
    async function getMergedData() {
        // Paralel çek
        const [matchList, oddsList] = await Promise.all([
            getAllMatches(),
            getOdds()
        ]);

        // Oranları maçlarla eşleştir (takım ismi benzerliğine göre)
        const merged = matchList.map(match => {
            const homeName = match.homeTeam?.shortName || match.homeTeam?.name || "";
            const awayName = match.awayTeam?.shortName || match.awayTeam?.name || "";

            // Odds API'den benzer isim bul
            const oddsEntry = oddsList.find(o => {
                const oh = o.home_team?.toLowerCase() || "";
                const oa = o.away_team?.toLowerCase() || "";
                return oh.includes(homeName.toLowerCase().split(" ")[0]) ||
                       oa.includes(awayName.toLowerCase().split(" ")[0]);
            });

            // Her bookmaker için oranları işle
            let bookmakers = [];
            let bestMs1 = null, bestMsx = null, bestMs2 = null;

            if (oddsEntry?.bookmakers) {
                bookmakers = oddsEntry.bookmakers.map(bm => {
                    const h2h = bm.markets?.find(m => m.key === "h2h");
                    const outcomes = h2h?.outcomes || [];

                    const ms1 = outcomes.find(o => o.name === oddsEntry.home_team)?.price || null;
                    const ms2 = outcomes.find(o => o.name === oddsEntry.away_team)?.price || null;
                    const msx = outcomes.find(o => o.name === "Draw")?.price || null;

                    return {
                        name:      bm.title,
                        lastUpdate: bm.last_update,
                        ms1, msx, ms2
                    };
                }).filter(b => b.ms1 && b.ms2);

                // En iyi oranlar
                if (bookmakers.length > 0) {
                    bestMs1 = Math.max(...bookmakers.map(b => b.ms1));
                    bestMsx = bookmakers.some(b => b.msx)
                        ? Math.max(...bookmakers.filter(b => b.msx).map(b => b.msx))
                        : null;
                    bestMs2 = Math.max(...bookmakers.map(b => b.ms2));
                }
            }

            // İlk bookmaker = açılış, en güncel = kapanış olarak kullan
            const openBm  = bookmakers[0];
            const closeBm = bookmakers[bookmakers.length - 1] || openBm;

            return {
                id:         match.id,
                oddsId:     oddsEntry?.id || null,
                league:     match.competition?.name || "Bilinmiyor",
                leagueCode: match.competition?.code || "",
                home:       match.homeTeam?.shortName || match.homeTeam?.name || "?",
                away:       match.awayTeam?.shortName || match.awayTeam?.name || "?",
                homeId:     match.homeTeam?.id,
                awayId:     match.awayTeam?.id,
                date:       match.utcDate?.split("T")[0] || "",
                time:       match.utcDate?.split("T")[1]?.substring(0, 5) || "",
                status:     normalizeStatus(match.status),
                scoreHome:  match.score?.fullTime?.home ?? "-",
                scoreAway:  match.score?.fullTime?.away ?? "-",
                minute:     match.minute || null,

                openOdds: openBm ? {
                    ms1: openBm.ms1,
                    msx: openBm.msx,
                    ms2: openBm.ms2
                } : null,

                closeOdds: closeBm ? {
                    ms1: closeBm.ms1,
                    msx: closeBm.msx,
                    ms2: closeBm.ms2
                } : null,

                bookmakers,
                bestOdds: { ms1: bestMs1, msx: bestMsx, ms2: bestMs2 }
            };
        });

        return merged.filter(m => m.openOdds); // Oranı olan maçları döndür
    }

    // Durum normalize et
    function normalizeStatus(status) {
        const map = {
            SCHEDULED:  "upcoming",
            TIMED:      "upcoming",
            IN_PLAY:    "live",
            LIVE:       "live",
            PAUSED:     "live",
            FINISHED:   "finished",
            SUSPENDED:  "upcoming",
            POSTPONED:  "finished",
            CANCELLED:  "finished"
        };
        return map[status] || "upcoming";
    }

    // Public API
    return {
        getMatches,
        getAllMatches,
        getLiveMatches,
        getOdds,
        getHistoricalOdds,
        getLiveOdds,
        getSports,
        getMergedData,
        checkOddsApiQuota
    };

})();
