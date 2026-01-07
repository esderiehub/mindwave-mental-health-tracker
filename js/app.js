// Global State
let currentMood = null;
let selectedActivities = [];
let moodData = JSON.parse(localStorage.getItem('mindwave_mood_data')) || [];
let journalEntries = JSON.parse(localStorage.getItem('mindwave_journal_entries')) || [];
let moodChart = null;

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    updateDashboard();
    initChart();
    loadJournalEntries();
    setCurrentDate();
});

function initializeApp() {
    console.log('🧠 MindWave initializing...');
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('moodDate');
    if (dateInput) dateInput.value = today;
    console.log('✅ App initialized successfully');
}

function setCurrentDate() {
    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateElement.textContent = now.toLocaleDateString('en-US', options);
    }
}

function showSection(sectionId) {
    console.log(`🔄 Switching to section: ${sectionId}`);
    
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeButton = Array.from(document.querySelectorAll('.nav-btn')).find(btn => 
        btn.textContent.toLowerCase().includes(sectionId.toLowerCase())
    );
    
    if (activeButton) {
        activeButton.classList.add('active');
    }
    
    if (sectionId === 'dashboard') {
        updateDashboard();
        updateChart();
    } else if (sectionId === 'insights') {
        updateInsights();
    } else if (sectionId === 'journal') {
        loadJournalEntries();
    }
}

function setupEventListeners() {
    console.log('🔧 Setting up event listeners...');
    
    // Mood selection
    document.querySelectorAll('.mood-item').forEach(item => {
        item.addEventListener('click', function() {
            currentMood = parseInt(this.getAttribute('data-mood'));
            document.querySelectorAll('.mood-item').forEach(m => m.classList.remove('selected'));
            this.classList.add('selected');
        });
    });
    
    // Activity selection
    document.querySelectorAll('.activity-tag').forEach(tag => {
        tag.addEventListener('click', function() {
            const activity = this.getAttribute('data-activity');
            if (selectedActivities.includes(activity)) {
                selectedActivities = selectedActivities.filter(a => a !== activity);
                this.classList.remove('selected');
            } else {
                selectedActivities.push(activity);
                this.classList.add('selected');
            }
        });
    });
    
    // Energy slider
    const energySlider = document.getElementById('energySlider');
    const energyValue = document.getElementById('energyValue');
    
    if (energySlider && energyValue) {
        energySlider.addEventListener('input', function() {
            energyValue.textContent = this.value;
        });
    }
    
    // Forms
    const moodForm = document.getElementById('moodForm');
    if (moodForm) {
        moodForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveMoodEntry();
        });
    }
    
    const journalForm = document.getElementById('journalEntryForm');
    if (journalForm) {
        journalForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveJournalEntry();
        });
    }
}

function saveMoodEntry() {
    if (currentMood === null) {
        alert('Please select a mood! 😊');
        return;
    }
    
    const date = document.getElementById('moodDate').value;
    const energy = parseInt(document.getElementById('energySlider').value);
    const notes = document.getElementById('moodNotes').value;
    
    if (!date) {
        alert('Please select a date!');
        return;
    }
    
    const entry = {
        id: Date.now(),
        date: date,
        mood: currentMood,
        energy: energy,
        activities: [...selectedActivities],
        notes: notes,
        timestamp: new Date().toISOString()
    };
    
    const existingIndex = moodData.findIndex(item => item.date === date);
    if (existingIndex !== -1) {
        if (confirm('An entry for this date already exists. Do you want to update it?')) {
            moodData[existingIndex] = entry;
        } else return;
    } else {
        moodData.push(entry);
    }
    
    localStorage.setItem('mindwave_mood_data', JSON.stringify(moodData));
    resetMoodForm();
    updateDashboard();
    updateChart();
    showSuccessMessage('Mood entry saved successfully! 🎉');
    setTimeout(() => showSection('dashboard'), 1000);
}

function resetMoodForm() {
    currentMood = null;
    selectedActivities = [];
    
    document.querySelectorAll('.mood-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    document.querySelectorAll('.activity-tag').forEach(tag => {
        tag.classList.remove('selected');
    });
    
    const energySlider = document.getElementById('energySlider');
    const energyValue = document.getElementById('energyValue');
    const notesField = document.getElementById('moodNotes');
    
    if (energySlider && energyValue) {
        energySlider.value = 5;
        energyValue.textContent = 5;
    }
    
    if (notesField) notesField.value = '';
}

function updateDashboard() {
    const totalEntriesEl = document.getElementById('totalEntries');
    if (totalEntriesEl) totalEntriesEl.textContent = moodData.length;
    
    const streakEl = document.getElementById('currentStreak');
    if (streakEl) streakEl.textContent = calculateStreak();
    
    const avgMoodEl = document.getElementById('avgMood');
    if (avgMoodEl && moodData.length > 0) {
        const avgMood = (moodData.reduce((sum, entry) => sum + entry.mood, 0) / moodData.length).toFixed(1);
        avgMoodEl.textContent = avgMood;
    }
    
    const avgEnergyEl = document.getElementById('avgEnergy');
    if (avgEnergyEl && moodData.length > 0) {
        const avgEnergy = (moodData.reduce((sum, entry) => sum + entry.energy, 0) / moodData.length).toFixed(1);
        avgEnergyEl.textContent = avgEnergy;
    }
    
    updateRecentEntries();
}

function calculateStreak() {
    if (moodData.length === 0) return 0;
    
    const sortedData = [...moodData].sort((a, b) => new Date(b.date) - new Date(a.date));
    let streak = 0;
    let currentDate = new Date();
    
    for (let entry of sortedData) {
        const entryDate = new Date(entry.date);
        const diffTime = currentDate - entryDate;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0 || diffDays === 1) {
            streak++;
            currentDate = new Date(entryDate);
            currentDate.setDate(currentDate.getDate() - 1);
        } else break;
    }
    
    return streak;
}

function updateRecentEntries() {
    const container = document.getElementById('recentEntriesList');
    if (!container) return;
    
    if (moodData.length === 0) {
        container.innerHTML = '<p class="empty-state">Start tracking to see your entries here!</p>';
        return;
    }
    
    const recentEntries = [...moodData]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);
    
    const getMoodEmoji = (mood) => {
        const emojis = ['', '😢', '😔', '😐', '😊', '😄'];
        return emojis[mood] || '😐';
    };
    
    const entriesHTML = recentEntries.map(entry => {
        const date = new Date(entry.date).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric'
        });
        
        return `
            <div class="entry-item">
                <div class="entry-mood">${getMoodEmoji(entry.mood)}</div>
                <div class="entry-details">
                    <div class="entry-date">${date}</div>
                    <div class="entry-stats">Mood: ${entry.mood}/5 • Energy: ${entry.energy}/10</div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = entriesHTML;
}

function initChart() {
    const canvas = document.getElementById('moodChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    moodChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Mood',
                data: [],
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 6
            }, {
                label: 'Energy',
                data: [],
                borderColor: '#764ba2',
                backgroundColor: 'rgba(118, 75, 162, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10
                }
            }
        }
    });
    
    updateChart();
}

function updateChart(days = 7) {
    if (!moodChart || moodData.length === 0) return;
    
    const sortedData = [...moodData]
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(-days);
    
    const labels = sortedData.map(entry => {
        const date = new Date(entry.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    
    const moodValues = sortedData.map(entry => entry.mood);
    const energyValues = sortedData.map(entry => entry.energy);
    
    moodChart.data.labels = labels;
    moodChart.data.datasets[0].data = moodValues;
    moodChart.data.datasets[1].data = energyValues;
    moodChart.update();
}

function updateChartPeriod(days) {
    document.querySelectorAll('.period-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    updateChart(days);
}

function updateInsights() {
    const container = document.getElementById('insightsContent');
    if (!container) return;
    
    if (moodData.length < 3) {
        container.innerHTML = `
            <div class="insight-placeholder">
                <div class="placeholder-icon">📈</div>
                <h3>Start Tracking to Unlock Insights!</h3>
                <p>Track your mood for a few days to discover personalized insights.</p>
                <button class="cta-btn" onclick="showSection('track')">Start Tracking</button>
            </div>
        `;
        return;
    }
    
    const insights = generateInsights();
    const insightsHTML = insights.map(insight => `
        <div class="insight-card">
            <div class="insight-icon">${insight.icon}</div>
            <h3>${insight.title}</h3>
            <p>${insight.description}</p>
            <div class="insight-value">${insight.value}</div>
        </div>
    `).join('');
    
    container.innerHTML = `<div class="insights-grid">${insightsHTML}</div>`;
}

function generateInsights() {
    const insights = [];
    
    // Most common mood
    const moodCounts = {};
    moodData.forEach(entry => {
        moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
    });
    const mostCommonMood = Object.keys(moodCounts).reduce((a, b) => 
        moodCounts[a] > moodCounts[b] ? a : b
    );
    const moodLabels = ['', 'Very Sad', 'Sad', 'Neutral', 'Happy', 'Very Happy'];
    
    insights.push({
        icon: '😊',
        title: 'Most Common Mood',
        description: 'Your most frequently recorded mood',
        value: moodLabels[mostCommonMood]
    });
    
    return insights;
}

function showJournalForm() {
    const form = document.getElementById('journalForm');
    if (form) {
        form.classList.remove('hidden');
        document.getElementById('journalTitle').focus();
    }
}

function hideJournalForm() {
    const form = document.getElementById('journalForm');
    if (form) {
        form.classList.add('hidden');
        document.getElementById('journalTitle').value = '';
        document.getElementById('journalContent').value = '';
    }
}

function saveJournalEntry() {
    const title = document.getElementById('journalTitle').value.trim();
    const content = document.getElementById('journalContent').value.trim();
    
    if (!title || !content) {
        alert('Please fill in both title and content!');
        return;
    }
    
    const entry = {
        id: Date.now(),
        title: title,
        content: content,
        date: new Date().toISOString(),
        formattedDate: new Date().toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        })
    };
    
    journalEntries.unshift(entry);
    localStorage.setItem('mindwave_journal_entries', JSON.stringify(journalEntries));
    
    loadJournalEntries();
    hideJournalForm();
    showSuccessMessage('Journal entry saved successfully! 📝');
}

function loadJournalEntries() {
    const container = document.getElementById('journalEntries');
    if (!container) return;
    
    if (journalEntries.length === 0) {
        container.innerHTML = `
            <div class="journal-placeholder">
                <div class="placeholder-icon">📔</div>
                <h3>No journal entries yet</h3>
                <p>Start writing your thoughts and reflections.</p>
            </div>
        `;
        return;
    }
    
    const entriesHTML = journalEntries.map(entry => `
        <div class="journal-entry">
            <h3>${escapeHtml(entry.title)}</h3>
            <p class="entry-date">${entry.formattedDate}</p>
            <p class="entry-content">${escapeHtml(entry.content)}</p>
            <button onclick="deleteJournalEntry(${entry.id})" class="delete-btn">🗑️ Delete</button>
        </div>
    `).join('');
    
    container.innerHTML = entriesHTML;
}

function deleteJournalEntry(entryId) {
    if (confirm('Are you sure you want to delete this journal entry?')) {
        journalEntries = journalEntries.filter(entry => entry.id !== entryId);
        localStorage.setItem('mindwave_journal_entries', JSON.stringify(journalEntries));
        loadJournalEntries();
        showSuccessMessage('Journal entry deleted successfully!');
    }
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;', '<': '&lt;', '>': '&gt;',
        '"': '&quot;', "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function showSuccessMessage(message) {
    const successEl = document.getElementById('successMessage');
    if (successEl) {
        successEl.querySelector('.success-text').textContent = message;
        successEl.classList.remove('hidden');
        setTimeout(() => successEl.classList.add('hidden'), 3000);
    }
}
