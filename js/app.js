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

// Initialize App
function initializeApp() {
    console.log('🧠 MindWave initializing...');
    
    // Set today's date
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('moodDate');
    if (dateInput) {
        dateInput.value = today;
    }
    
    console.log('✅ App initialized successfully');
}

// Set current date display
function setCurrentDate() {
    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        dateElement.textContent = now.toLocaleDateString('en-US', options);
    }
}

// Navigation Functions
function showSection(sectionId) {
    console.log(`🔄 Switching to section: ${sectionId}`);
    
    // Hide all sections
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Show target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        console.log(`✅ Section ${sectionId} activated`);
    } else {
        console.error(`❌ Section ${sectionId} not found`);
        return;
    }
    
    // Update nav buttons
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Find and activate the correct nav button
    const activeButton = Array.from(navButtons).find(btn => 
        btn.textContent.toLowerCase().includes(sectionId.toLowerCase()) ||
        (sectionId === 'dashboard' && btn.textContent.toLowerCase().includes('dashboard')) ||
        (sectionId === 'track' && btn.textContent.toLowerCase().includes('track')) ||
        (sectionId === 'insights' && btn.textContent.toLowerCase().includes('insights')) ||
        (sectionId === 'journal' && btn.textContent.toLowerCase().includes('journal'))
    );
    
    if (activeButton) {
        activeButton.classList.add('active');
    }
    
    // Update specific section content if needed
    if (sectionId === 'dashboard') {
        updateDashboard();
        updateChart();
    } else if (sectionId === 'insights') {
        updateInsights();
    } else if (sectionId === 'journal') {
        loadJournalEntries();
    }
}

// Setup Event Listeners
function setupEventListeners() {
    console.log('🔧 Setting up event listeners...');
    
    // Navigation buttons
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const text = this.textContent.toLowerCase();
            if (text.includes('dashboard')) {
                showSection('dashboard');
            } else if (text.includes('track')) {
                showSection('track');
            } else if (text.includes('insights')) {
                showSection('insights');
            } else if (text.includes('journal')) {
                showSection('journal');
            }
        });
    });
    
    // Mood selection
    const moodItems = document.querySelectorAll('.mood-item');
    moodItems.forEach(item => {
        item.addEventListener('click', function() {
            currentMood = parseInt(this.getAttribute('data-mood'));
            
            // Update UI
            moodItems.forEach(m => m.classList.remove('selected'));
            this.classList.add('selected');
            
            console.log(`😊 Mood selected: ${currentMood}`);
        });
    });
    
    // Activity selection
    const activityTags = document.querySelectorAll('.activity-tag');
    activityTags.forEach(tag => {
        tag.addEventListener('click', function() {
            const activity = this.getAttribute('data-activity');
            
            if (selectedActivities.includes(activity)) {
                selectedActivities = selectedActivities.filter(a => a !== activity);
                this.classList.remove('selected');
            } else {
                selectedActivities.push(activity);
                this.classList.add('selected');
            }
            
            console.log(`🏃‍♂️ Activities: ${selectedActivities.join(', ')}`);
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
    
    // Mood form submission
    const moodForm = document.getElementById('moodForm');
    if (moodForm) {
        moodForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveMoodEntry();
        });
    }
    
    // Journal form submission
    const journalForm = document.getElementById('journalEntryForm');
    if (journalForm) {
        journalForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveJournalEntry();
        });
    }
    
    console.log('✅ Event listeners setup complete');
}

// Save Mood Entry
function saveMoodEntry() {
    console.log('💾 Saving mood entry...');
    
    // Validation
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
    
    // Create entry
    const entry = {
        id: Date.now(),
        date: date,
        mood: currentMood,
        energy: energy,
        activities: [...selectedActivities],
        notes: notes,
        timestamp: new Date().toISOString()
    };
    
    // Check if entry for this date already exists
    const existingIndex = moodData.findIndex(item => item.date === date);
    
    if (existingIndex !== -1) {
        if (confirm('An entry for this date already exists. Do you want to update it?')) {
            moodData[existingIndex] = entry;
        } else {
            return;
        }
    } else {
        moodData.push(entry);
    }
    
    // Save to localStorage
    localStorage.setItem('mindwave_mood_data', JSON.stringify(moodData));
    
    console.log('✅ Mood entry saved:', entry);
    
    // Reset form
    resetMoodForm();
    
    // Update dashboard
    updateDashboard();
    updateChart();
    
    // Show success message
    showSuccessMessage('Mood entry saved successfully! 🎉');
    
    // Switch to dashboard
    setTimeout(() => {
        showSection('dashboard');
    }, 1000);
}

// Reset Mood Form
function resetMoodForm() {
    console.log('🔄 Resetting mood form...');
    
    currentMood = null;
    selectedActivities = [];
    
    // Reset mood selection
    document.querySelectorAll('.mood-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Reset activity selection
    document.querySelectorAll('.activity-tag').forEach(tag => {
        tag.classList.remove('selected');
    });
    
    // Reset form inputs
    const energySlider = document.getElementById('energySlider');
    const energyValue = document.getElementById('energyValue');
    const notesField = document.getElementById('moodNotes');
    
    if (energySlider && energyValue) {
        energySlider.value = 5;
        energyValue.textContent = 5;
    }
    
    if (notesField) {
        notesField.value = '';
    }
    
    console.log('✅ Form reset complete');
}

// Update Dashboard
function updateDashboard() {
    console.log('📊 Updating dashboard...');
    
    // Total entries
    const totalEntriesEl = document.getElementById('totalEntries');
    if (totalEntriesEl) {
        totalEntriesEl.textContent = moodData.length;
    }
    
    // Current streak
    const streakEl = document.getElementById('currentStreak');
    if (streakEl) {
        streakEl.textContent = calculateStreak();
    }
    
    // Average mood
    const avgMoodEl = document.getElementById('avgMood');
    if (avgMoodEl && moodData.length > 0) {
        const avgMood = (moodData.reduce((sum, entry) => sum + entry.mood, 0) / moodData.length).toFixed(1);
        avgMoodEl.textContent = avgMood;
    }
    
    // Average energy
    const avgEnergyEl = document.getElementById('avgEnergy');
    if (avgEnergyEl && moodData.length > 0) {
        const avgEnergy = (moodData.reduce((sum, entry) => sum + entry.energy, 0) / moodData.length).toFixed(1);
        avgEnergyEl.textContent = avgEnergy;
    }
    
    // Update recent entries
    updateRecentEntries();
    
    console.log('✅ Dashboard updated');
}

// Calculate Streak
function calculateStreak() {
    if (moodData.length === 0) return 0;
    
    const sortedData = [...moodData].sort((a, b) => new Date(b.date) - new Date(a.date));
    const today = new Date();
    let streak = 0;
    let currentDate = new Date(today);
    
    for (let entry of sortedData) {
        const entryDate = new Date(entry.date);
        const diffTime = currentDate - entryDate;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0 || diffDays === 1) {
            streak++;
            currentDate = new Date(entryDate);
            currentDate.setDate(currentDate.getDate() - 1);
        } else {
            break;
        }
    }
    
    return streak;
}

// Update Recent Entries
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
            month: 'short',
            day: 'numeric'
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

// Initialize Chart
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
                pointBackgroundColor: '#667eea',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6
            }, {
                label: 'Energy',
                data: [],
                borderColor: '#764ba2',
                backgroundColor: 'rgba(118, 75, 162, 0.1)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#764ba2',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            }
        }
    });
    
    updateChart();
}

// Update Chart
function updateChart(days = 7) {
    if (!moodChart || moodData.length === 0) return;
    
    const sortedData = [...moodData]
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(-days);
    
    const labels = sortedData.map(entry => {
        const date = new Date(entry.date);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
        });
    });
    
    const moodValues = sortedData.map(entry => entry.mood);
    const energyValues = sortedData.map(entry => entry.energy);
    
    moodChart.data.labels = labels;
    moodChart.data.datasets[0].data = moodValues;
    moodChart.data.datasets[1].data = energyValues;
    moodChart.update();
}

// Update Chart Period
function updateChartPeriod(days) {
    // Update active button
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update chart
    updateChart(days);
}

// Update Insights
function updateInsights() {
    const container = document.getElementById('insightsContent');
    if (!container) return;
    
    if (moodData.length < 3) {
        container.innerHTML = `
            <div class="insight-placeholder">
                <div class="placeholder-icon">📈</div>
                <h3>Start Tracking to Unlock Insights!</h3>
                <p>Track your mood for a few days to discover personalized insights about your mental health patterns.</p>
                <button class="cta-btn" onclick="showSection('track')">Start Tracking</button>
            </div>
        `;
        return;
    }
    
    // Generate insights
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

// Generate Insights
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
    
    // Best activity for mood
    const activityMoodMap = {};
    moodData.forEach(entry => {
        entry.activities.forEach(activity => {
            if (!activityMoodMap[activity]) {
                activityMoodMap[activity] = [];
            }
            activityMoodMap[activity].push(entry.mood);
        });
    });
    
    let bestActivity = 'None';
    let bestMoodAvg = 0;
    
    Object.keys(activityMoodMap).forEach(activity => {
        const avg = activityMoodMap[activity].reduce((a, b) => a + b, 0) / activityMoodMap[activity].length;
        if (avg > bestMoodAvg) {
            bestMoodAvg = avg;
            bestActivity = activity;
        }
    });
    
    if (bestActivity !== 'None') {
        insights.push({
            icon: '🎯',
            title: 'Mood Booster',
            description: 'Activity that makes you happiest',
            value: bestActivity.charAt(0).toUpperCase() + bestActivity.slice(1)
        });
    }
    
    // Energy trend
    const recentEntries = [...moodData].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 7);
    if (recentEntries.length >= 2) {
        const oldAvg = recentEntries.slice(3).reduce((sum, entry) => sum + entry.energy, 0) / Math.max(recentEntries.slice(3).length, 1);
        const newAvg = recentEntries.slice(0, 3).reduce((sum, entry) => sum + entry.energy, 0) / 3;
        
        const trend = newAvg > oldAvg ? 'Increasing' : newAvg < oldAvg ? 'Decreasing' : 'Stable';
        const trendIcon = newAvg > oldAvg ? '📈' : newAvg < oldAvg ? '📉' : '➡️';
        
        insights.push({
            icon: trendIcon,
            title: 'Energy Trend',
            description: 'Your recent energy levels',
            value: trend
        });
    }
    
    return insights;
}

// Journal Functions
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

// Save Journal Entry - İŞTE EKSİK OLAN BÖLÜM!
function saveJournalEntry() {
    console.log('📝 Saving journal entry...');
    
    const title = document.getElementById('journalTitle').value.trim();
    const content = document.getElementById('journalContent').value.trim();
    
    if (!title || !content) {
        alert('Please fill in both title and content!');
        return;
    }
    
    // Create journal entry object - BU EKSİKTİ!
    const entry = {
        id: Date.now(),
        title: title,
        content: content,
        date: new Date().toISOString(),
        formattedDate: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    };
    
    // Save to journal entries array
    journalEntries.unshift(entry); // Add to beginning
    localStorage.setItem('mindwave_journal_entries', JSON.stringify(journalEntries));
    
    console.log('✅ Journal entry saved:', entry);
    
    // Update display and hide form
    loadJournalEntries();
    hideJournalForm();
    
    // Show success message
    showSuccessMessage('Journal entry saved successfully! 📝');
}

// Load Journal Entries
function loadJournalEntries() {
    const container = document.getElementById('journalEntries');
    if (!container) return;
    
    if (journalEntries.length === 0) {
        container.innerHTML = `
            <div class="journal-placeholder">
                <div class="placeholder-icon">📔</div>
                <h3>No journal entries yet</h3>
                <p>Start writing your thoughts and reflections. Your entries are completely private and stored only on your device.</p>
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

// Delete Journal Entry
function deleteJournalEntry(entryId) {
    if (confirm('Are you sure you want to delete this journal entry?')) {
        journalEntries = journalEntries.filter(entry => entry.id !== entryId);
        localStorage.setItem('mindwave_journal_entries', JSON.stringify(journalEntries));
        loadJournalEntries();
        showSuccessMessage('Journal entry deleted successfully!');
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Show Success Message
function showSuccessMessage(message) {
    const successEl = document.getElementById('successMessage');
    if (successEl) {
        successEl.querySelector('.success-text').textContent = message;
        successEl.classList.remove('hidden');
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            successEl.classList.add('hidden');
        }, 3000);
    }
}

// Entry Item CSS 
const additionalCSS = `
.entry-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--bg-white);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-light);
    margin-bottom: 0.5rem;
}

.entry-mood {
    font-size: 2rem;
}

.entry-details {
    flex: 1;
}

.entry-date {
    font-weight: 600;
    color: var(--text-primary);
}

.entry-stats {
    color: var(--text-secondary);
    font-size: 0.875rem;
}

.insights-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
}

.insight-card {
    background: var(--bg-white);
    padding: 2rem;
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    border: 1px solid var(--border-light);
    text-align: center;
}

.insight-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
}

.insight-card h3 {
    color: var(--text-primary);
    margin-bottom: 0.5rem;
}

.insight-value {
    font-size: 1.5rem;
    font-weight: 600;
    color: #667eea;
    margin-top: 1rem;
}

.delete-btn {
    background: #ef4444;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 0.875rem;
    margin-top: 1rem;
}

.delete-btn:hover {
    background: #dc2626;
}
`;
