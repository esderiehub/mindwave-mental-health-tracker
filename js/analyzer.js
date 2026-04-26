var Analyzer = (function () {

    // ─── ANA FONKSİYON ──────────────────────────────────────────
    // Her upcoming maç için geçmiş maçlarla karşılaştır
    function analyzeAll(upcomingMatches, historyMatches) {
        return upcomingMatches.map(function (match) {
            var similar = findSimilar(match, historyMatches);
            var prediction = calcPrediction(match, similar);
            return Object.assign({}, match, {
                similarMatches: similar,
                prediction:     prediction
            });
        });
    }

    // ─── BENZERLİK MOTORU ───────────────────────────────────────
    function findSimilar(target, history) {
        if (!target.avgOdds) return [];

        var scored = history.map(function (h) {
            var score = calcSimilarity(target, h);
            return { match: h, score: score };
        });

        // Skora göre sırala, min eşiği geç, ilk N'i al
        return scored
            .filter(function (s) { return s.score >= CONFIG.MIN_SIMILARITY; })
            .sort(function (a, b) { return b.score - a.score; })
            .slice(0, CONFIG.TOP_SIMILAR)
            .map(function (s) {
                return Object.assign({}, s.match, {
                    similarityScore: +(s.score * 100).toFixed(1)
                });
            });
    }

    // ─── BENZERLİK SKORU ────────────────────────────────────────
    function calcSimilarity(target, history) {
        if (!target.avgOdds || !history.avgOdds) return 0;

        var tO = target.avgOdds;
        var hO = history.avgOdds;

        // ms1 farkı (normalize)
        var d1 = 1 - Math.min(Math.abs(tO.ms1 - hO.ms1) / tO.ms1, 1);
        // beraberlik farkı
        var dx = tO.msx && hO.msx
            ? 1 - Math.min(Math.abs(tO.msx - hO.msx) / tO.msx, 1)
            : 0.5;
        // ms2 farkı
        var d2 = 1 - Math.min(Math.abs(tO.ms2 - hO.ms2) / tO.ms2, 1);

        // Aynı lig bonusu
        var leagueBonus = target.leagueCode === history.leagueCode ? 0.10 : 0;

        // Favori yönü aynı mı? (ms1<ms2 ise ev sahibi favori)
        var tFav = tO.ms1 < tO.ms2 ? "home" : "away";
        var hFav = hO.ms1 < hO.ms2 ? "home" : "away";
        var favBonus = tFav === hFav ? 0.05 : 0;

        var raw = (d1 * 0.40) + (dx * 0.25) + (d2 * 0.35)
                  + leagueBonus + favBonus;

        return Math.min(raw, 1);
    }

    // ─── TAHMİN HESAPLA ─────────────────────────────────────────
    function calcPrediction(match, similar) {
        if (!match.avgOdds) return null;

        // 1) Olasılık hesabı (oran → olasılık → normalize)
        var o = match.avgOdds;
        var raw1 = o.ms1 > 0 ? 1 / o.ms1 : 0;
        var rawX = o.msx > 0 ? 1 / o.msx : 0;
        var raw2 = o.ms2 > 0 ? 1 / o.ms2 : 0;
        var total = raw1 + rawX + raw2;
        var prob1 = total > 0 ? raw1 / total : 0;
        var probX = total > 0 ? rawX / total : 0;
        var prob2 = total > 0 ? raw2 / total : 0;

        // 2) Geçmiş maç istatistikleri
        var hist = { "1": 0, "X": 0, "2": 0 };
        var weightedHist = { "1": 0, "X": 0, "2": 0 };
        var totalWeight  = 0;

        similar.forEach(function (s) {
            if (!s.result) return;
            var w = s.similarityScore / 100;
            hist[s.result]++;
            weightedHist[s.result] += w;
            totalWeight += w;
        });

        var histTotal = hist["1"] + hist["X"] + hist["2"];

        // 3) Ağırlıklı karışım (oran %60 + geçmiş %40)
        var finalProb1, finalProbX, finalProb2;
        if (totalWeight > 0 && histTotal >= 2) {
            var hProb1 = weightedHist["1"] / totalWeight;
            var hProbX = weightedHist["X"] / totalWeight;
            var hProb2 = weightedHist["2"] / totalWeight;
            finalProb1 = (prob1 * 0.60) + (hProb1 * 0.40);
            finalProbX = (probX * 0.60) + (hProbX * 0.40);
            finalProb2 = (prob2 * 0.60) + (hProb2 * 0.40);
        } else {
            finalProb1 = prob1;
            finalProbX = probX;
            finalProb2 = prob2;
        }

        // Normalize
        var fTotal = finalProb1 + finalProbX + finalProb2;
        if (fTotal > 0) {
            finalProb1 /= fTotal;
            finalProbX /= fTotal;
            finalProb2 /= fTotal;
        }

        // 4) Önerilen sonuç
        var recommended = "1";
        var maxProb     = finalProb1;
        if (finalProbX > maxProb) { recommended = "X"; maxProb = finalProbX; }
        if (finalProb2 > maxProb) { recommended = "2"; maxProb = finalProb2; }

        // 5) Güven seviyesi
        var confidence;
        var spread = Math.max(finalProb1, finalProbX, finalProb2)
                   - Math.min(finalProb1, finalProbX, finalProb2);
        if (spread >= 0.30)      confidence = "Yüksek";
        else if (spread >= 0.15) confidence = "Orta";
        else                     confidence = "Düşük";

        // 6) Value Bet tespiti
        var valueBets = [];
        var fairOdd1  = finalProb1 > 0 ? +(1 / finalProb1).toFixed(2) : 0;
        var fairOddX  = finalProbX > 0 ? +(1 / finalProbX).toFixed(2) : 0;
        var fairOdd2  = finalProb2 > 0 ? +(1 / finalProb2).toFixed(2) : 0;

        if (match.bestOdds) {
            if (match.bestOdds.ms1 > fairOdd1 * 1.03) {
                valueBets.push({
                    outcome: "1 (Ev Sahibi)",
                    marketOdd: match.bestOdds.ms1,
                    fairOdd:   fairOdd1,
                    edge:      +(((match.bestOdds.ms1 / fairOdd1) - 1) * 100).toFixed(1)
                });
            }
            if (match.bestOdds.msx && match.bestOdds.msx > fairOddX * 1.03) {
                valueBets.push({
                    outcome: "X (Beraberlik)",
                    marketOdd: match.bestOdds.msx,
                    fairOdd:   fairOddX,
                    edge:      +(((match.bestOdds.msx / fairOddX) - 1) * 100).toFixed(1)
                });
            }
            if (match.bestOdds.ms2 > fairOdd2 * 1.03) {
                valueBets.push({
                    outcome: "2 (Deplasman)",
                    marketOdd: match.bestOdds.ms2,
                    fairOdd:   fairOdd2,
                    edge:      +(((match.bestOdds.ms2 / fairOdd2) - 1) * 100).toFixed(1)
                });
            }
        }

        // 7) Oran hareketi analizi
        var oddMovement = analyzeMovement(match);

        return {
            prob1:       +(finalProb1 * 100).toFixed(1),
            probX:       +(finalProbX * 100).toFixed(1),
            prob2:       +(finalProb2 * 100).toFixed(1),
            recommended: recommended,
            confidence:  confidence,
            fairOdds:    { ms1: fairOdd1, msx: fairOddX, ms2: fairOdd2 },
            valueBets:   valueBets,
            histStats:   {
                total: histTotal,
                win1:  hist["1"],
                draw:  hist["X"],
                win2:  hist["2"]
            },
            oddMovement: oddMovement
        };
    }

    // ─── ORAN HAREKETİ ───────────────────────────────────────────
    function analyzeMovement(match) {
        if (!match.openOdds || !match.closeOdds) return null;
        var o = match.openOdds;
        var c = match.closeOdds;

        function pct(open, close) {
            if (!open || open === 0) return 0;
            return +(((close - open) / open) * 100).toFixed(1);
        }

        var chg1 = pct(o.ms1, c.ms1);
        var chgX = pct(o.msx, c.msx);
        var chg2 = pct(o.ms2, c.ms2);

        // Para akışı yorumu
        var signal = "Belirsiz";
        if (chg1 < -3)       signal = "💰 Ev sahibine para akıyor";
        else if (chg2 < -3)  signal = "💰 Deplasmana para akıyor";
        else if (chg1 > 3)   signal = "📈 Ev sahibi kısaltıldı";
        else if (chg2 > 3)   signal = "📈 Deplasman kısaltıldı";

        return {
            chg1:   chg1,
            chgX:   chgX,
            chg2:   chg2,
            signal: signal
        };
    }

    return {
        analyzeAll:    analyzeAll,
        findSimilar:   findSimilar,
        calcPrediction: calcPrediction
    };

})();
