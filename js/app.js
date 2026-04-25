// ============================================================
//  ANA UYGULAMA - Tüm modülleri birleştirir
// ============================================================

const App = (() => {

    // Uygulama state'i
    let state = {
        allMatches:    [],
        liveMatches:   [],
        filteredMatches: [],
        selectedMatch: null,
        oddsTimer:     null,
        liveTimer:     null,
        isLoading:     false
    };

    // ===== BAŞLAT =====
    async function init() {
        if (state.isLoading) return;
        state.isLoading = true;

        console.log('🚀 SportAnaliz başlatılıyor...');

        // Loader göster
        RenderService.showLoader('oddsTableBody');
        RenderService.showLoader('liveGrid');

        setDefaultDate();

        try {
            // Paralel veri çek
            const [mergedData, liveData, quota] = await Promise.all([
                ApiService.getMergedData(),
                ApiService.getLiveMatches(),
                ApiService.checkOddsApiQuota()
            ]);

            // State güncelle
            state.allMatches      = mergedData;
            state.filteredMatches = mergedData;
            state.liveMatches     = normalizeLive(liveData, mergedData);

            // Ekrana çiz
            RenderService.renderOddsTable(state.filteredMatches);
            RenderService.renderBookmakerSelector(state.filteredMatches);
            RenderService.renderLiveMatches(state.liveMatches);
            RenderService.renderLastUpdate();

            // İlk bookmaker tablosunu çiz
            if (state.filteredMatches.length > 0) {
                RenderService.renderBookmakerTable(state.filteredMatches[0]);
            }

            // API kota göster
            if (quota?.remaining) {
                RenderService.renderQuotaBar(quota.used, quota.remaining);
            }

            // Periyodik güncelleme başlat
            startAutoRefresh();

            console.log(`✅ ${mergedData.length} maç yüklendi.`);

        } catch (err) {
            console.error('❌ Uygulama başlatma hatası:', err);
            RenderService.showError('oddsTableBody',
                'Veriler yüklenirken hata oluştu. API key\'lerinizi kontrol edin.');
            RenderService.showError('liveGrid', 'Canlı veriler alınamadı.');
        } finally {
            state.isLoading = false;
        }
    }

    // ===== CANLI MAÇ NORMALİZE =====
    function normalizeLive(liveRaw, mergedData) {
        if (!liveRaw?.length) {
            // Merged data içinden live olanları göster
            return mergedData.filter(m => m.status === 'live');
        }
        return liveRaw.map(m => ({
            id:          m.id,
            league:      m.competition?.name || '',
            leagueCode:  m.competition?.code || '',
            home:        m.homeTeam?.shortName || m.homeTeam?.name || '?',
            away:        m.awayTeam?.shortName || m.awayTeam?.name || '?',
            scoreHome:   m.score?.fullTime?.home ?? (m.score?.halfTime?.home ?? 0),
            scoreAway:   m.score?.fullTime?.away ?? (m.score?.halfTime?.away ?? 0),
            minute:      m.minute || '?',
            status:      'live',
            closeOdds:   mergedData.find(md =>
                md.home.toLowerCase().includes(
                    (m.homeTeam?.shortName || '').toLowerCase().split(' ')[0]
                ))?.closeOdds || null
        }));
    }

    // ===== OTOMATİK YENİLEME =====
    function startAutoRefresh() {
        // Önceki timer'ları temizle
        if (state.oddsTimer) clearInterval(state.oddsTimer);
        if (state.liveTimer) clearInterval(state.liveTimer);

        // Oranları 60 saniyede bir güncelle
        state.oddsTimer = setInterval(async () => {
            console.log('🔄 Oranlar güncelleniyor...');
            try {
                const newData = await ApiService.getMergedData();
                if (newData?.length) {
                    state.allMatches = newData;
                    applyFilters();
                    RenderService.renderLastUpdate();
                }
            } catch (e) {
                console.warn('Oran güncelleme hatası:', e);
            }
        }, CONFIG.ODDS_REFRESH_MS);

        // Canlı maçları 30 saniyede bir güncelle
        state.liveTimer = setInterval(async () => {
            console.log('🔴 Canlı veriler güncelleniyor...');
            try {
                const liveData = await ApiService.getLiveMatches();
                state.liveMatches = normalizeLive(liveData, state.allMatches);
                RenderService.renderLiveMatches(state.liveMatches);
            } catch (e) {
                console.warn('Canlı güncelleme hatası:', e);
            }
        }, CONFIG.LIVE_REFRESH_MS);

        console.log('⏱️ Otomatik yenileme başlatıldı.');
    }

    // ===== FİLTRELEME =====
    function filterMatches() {
        applyFilters();
    }

    function applyFilters() {
        const leagueVal = document.getElementById('leagueFilter')?.value || 'all';
        const statusVal = document.getElementById('statusFilter')?.value || 'all';
        const dateVal   = document.getElementById('dateFilter')?.value   || '';
        const searchVal = document.getElementById('searchInput')?.value?.toLowerCase() || '';

        state.filteredMatches = state.allMatches.filter(m => {
            const leagueMap = {
                sl: 'Süper Lig',        pl: 'Premier League',
                la: 'Primera Division', bl: 'Bundesliga',
                sa: 'Serie A',          cl: 'UEFA Champions League',
                fl: 'Ligue 1'
            };
            const leagueOk  = leagueVal === 'all' || m.league === leagueMap[leagueVal];
            const statusOk  = statusVal === 'all' || m.status === statusVal;
            const dateOk    = !dateVal  || m.date === dateVal;
            const searchOk  = !searchVal ||
                m.home.toLowerCase().includes(searchVal) ||
                m.away.toLowerCase().includes(searchVal) ||
                m.league.toLowerCase().includes(searchVal);

            return leagueOk && statusOk && dateOk && searchOk;
        });

        RenderService.renderOddsTable(state.filteredMatches);
        RenderService.renderBookmakerSelector(state.filteredMatches);

        if (state.filteredMatches.length > 0) {
            RenderService.renderBookmakerTable(state.filteredMatches[0]);
        }
    }

    // ===== ANALİZ GÖSTER =====
    function showAnalysis(matchId) {
        const match = state.allMatches.find(m => String(m.id) === String(matchId));
        if (match) {
            RenderService.renderAnalysisModal(match);
        }
    }

    // ===== MODAL =====
    function openModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.style.display = 'flex';
            modal.style.alignItems = 'center';
            modal.style.justifyContent = 'center';
        }
    }

    function closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.style.display = 'none';
    }

    function switchModal(closeId, openId) {
        closeModal(closeId);
        openModal(openId);
    }

    // ===== PLAN SEÇ =====
    function selectPlan(el) {
        document.querySelectorAll('.plan-card')
            .forEach(c => c.classList.remove('selected'));
        el.classList.add('selected');
    }

    // ===== BUGÜNÜN TARİHİ =====
    function setDefaultDate() {
        const dateInput = document.getElementById('dateFilter');
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }
    }

    // ===== DIŞA TIKLA MODAL KAPAT =====
    window.addEventListener('click', e => {
        ['loginModal', 'registerModal'].forEach(id => {
            const modal = document.getElementById(id);
            if (modal && e.target === modal) modal.style.display = 'none';
        });
    });

    // ===== SAYFA YÜKLENINCE BAŞLAT =====
    document.addEventListener('DOMContentLoaded', init);

    // Public API
    return {
        init,
        filterMatches,
        showAnalysis,
        openModal,
        closeModal,
        switchModal,
        selectPlan,
        getState: () => state
    };

})();
