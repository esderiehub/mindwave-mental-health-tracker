const CONFIG = {
    // ✅ GERÇEK API KEY'LER
    ODDS_API_KEY:         "68713f6c35e2c93e34d5f19d21ecd543",
    FOOTBALL_DATA_KEY:    "1249e85e869a432ab22b2cc2569e193f",

    // Base URL'ler
    ODDS_BASE_URL:        "https://api.the-odds-api.com/v4",
    FOOTBALL_BASE_URL:    "https://api.football-data.org/v4",

    // Football-Data.org Lig ID'leri
    LEAGUES: {
        PL:  2021,   // Premier League
        BL1: 2002,   // Bundesliga
        SA:  2019,   // Serie A
        PD:  2014,   // La Liga
        FL1: 2015,   // Ligue 1
        CL:  2001,   // Champions League
        EC:  2016,   // Euro Championship
    },

    // The Odds API spor anahtarları
    SPORT_KEYS: [
        "soccer_epl",               // Premier League
        "soccer_germany_bundesliga",// Bundesliga
        "soccer_italy_serie_a",     // Serie A
        "soccer_spain_la_liga",     // La Liga
        "soccer_france_ligue_one",  // Ligue 1
        "soccer_uefa_champs_league" // Şampiyonlar Ligi
    ],

    // Bölge & Format
    REGIONS:      "eu",
    ODDS_FORMAT:  "decimal",

    // Yenileme süreleri (ms)
    LIVE_REFRESH_MS: 30000,   // 30 saniye
    ODDS_REFRESH_MS: 60000,   // 60 saniye

    // Gösterilecek max maç sayısı
    MAX_MATCHES: 30,
};
