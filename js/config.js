var CONFIG = {
    ODDS_API_KEY:  "68713f6c35e2c93e34d5f19d21ecd543",
    ODDS_API_BASE: "https://api.the-odds-api.com/v4",

    SPORTS: [
        "soccer_epl",
        "soccer_germany_bundesliga",
        "soccer_italy_serie_a",
        "soccer_spain_la_liga",
        "soccer_france_ligue_one",
        "soccer_turkey_super_league",
        "soccer_uefa_champs_league",
        "soccer_uefa_europa_league",
        "soccer_netherlands_eredivisie",
        "soccer_portugal_primeira_liga"
    ],

    REGIONS:        "eu",
    MARKETS:        "h2h",
    REFRESH:        300000,
    HISTORY_DAYS:   7,       // Kaç günlük geçmiş çekilsin
    MIN_SIMILARITY: 0.65,    // Minimum benzerlik skoru
    TOP_SIMILAR:    5        // En benzer kaç maç gösterilsin
};
