// Global variables
let moodData = JSON.parse(localStorage.getItem('moodData')) || [];
let currentMoodValue = null;
let selectedActivities = [];
let moodChart = null;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeDateInput();
    updateDashboard();
    createMoodChart();
    setupEventListeners();
    
    // Show dashboard by default
    showSection('dashboard');
});

// Date input initialization
function initializeDateInput() {
    const dateInput = document.getElementById('mood-date');
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
}

// Navigation
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionName).classList.add('active');
    
    // Update navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    document.querySelector(`[href="#${sectionName}"]`).classList.add('active');
    
    // Update content based on section
    if (sectionName === 'dashboard') {
        updateDashboard();
        updateMoodChart();
    } else if (sectionName === 'insights') {
        updateInsights();
    } else if (sectionName === 'journal') {
        updateJournal();
    }
}

// Event Listeners
function setupEventListeners() {
    // Navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.getAttribute('href').substring(1);
            showSection(section);
        });
    });
    
    // Mood selection
    document.querySelectorAll('.mood-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.mood-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            option.classList.add('selected');
            currentMoodValue = parseInt(option.getAttribute('data-value'));
        });
    });
    
    // Activity tags
    document.querySelectorAll('.tag').forEach(tag => {
        tag.addEventListener('click', () => {
            const activity = tag.getAttribute('data-activity');
            tag.classList.toggle('selected');
            
            if (selectedActivities.includes(activity)) {
                selectedActivities = selectedActivities.filter(a => a !== activity);
            } else {
                selectedActivities.push(activity);
            }
        });
    });
    
    // Energy slider
    const energySlider = document.getElementById('energy-slider');
    const energyValue = document.getElementById('energy-value');
    
    energySlider.addEventListener('input', () => {
        energyValue.textContent = energySlider.value;
    });
    
    // Form submission
    document.getElementById('mood-form').addEventListener('submit', saveMoodEntry);
}

// Save mood entry
function saveMoodEntry(e) {
    e.preventDefault();
    
    const date = document.getElementById('mood-date').value;
    const energy = parseInt(document.getElementById('energy-slider').value);
    const notes = document.getElementById('mood-notes').value;
    
    if (!currentMoodValue) {
        alert('Please select your mood! 😊');
        return;
    }
    
    const entry = {
        id: Date.now(),
        date: date,
        mood: currentMoodValue,
        energy: energy,
        activities: [...selectedActivities],
        notes: notes,
        timestamp: new Date().toISOString()
    };
    
    // Check if entry for this date already exists
    const existingIndex = moodData.findIndex(item => item.date === date);
    
    if (existingIndex !== -1) {
        moodData[existingIndex] = entry;
    } else {
        moodData.push(entry);
    }
    
    // Save to localStorage
    localStorage.setItem('moodData', JSON.stringify(moodData));
    
    // Reset form
    resetForm();
    
    // Show success message
    showSuccessMessage();
    
    // Update dashboard
    updateDashboard();
    
    // Switch to dashboard
    setTimeout(() => {
        showSection('dashboard');
    }, 1500);
}

// Reset form
function resetForm() {
    document.getElementById('mood-form').reset();
    document.querySelectorAll('.mood-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    document.querySelectorAll('.tag').forEach(tag => {
        tag.classList.remove('selected');
    });
    
    currentMoodValue = null;
    selectedActivities = [];
    document.getElementById('energy-value').textContent = '5';
    
    // Reset date to today
    initializeDateInput();
}

// Show success message
function showSuccessMessage() {
    const button = document.querySelector('.submit-btn');
    const originalText = button.textContent;
    button.textContent = '✅ Saved!';
    button.style.background = 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)';
    
    setTimeout(() => {
        button.textContent = originalText;
        button.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }, 1500);
}

// Update dashboard
function updateDashboard() {
    // Total entries
    document.getElementById('total-entries').textContent = moodData.length;
    
    // Current streak
    document.getElementById('current-streak').textContent = calculateStreak();
    
    // Average mood
    const avgMood = calculateAverageMood();
    document.getElementById('avg-mood').textContent = avgMood;
    
    // Average energy
    const avgEnergy = calculateAverageEnergy();
    document.getElementById('avg-energy').textContent = avgEnergy;
}

// Calculate streak
function calculateStreak() {
    if (moodData.length === 0) return 0;
    
    const sortedData = moodData.sort((a, b) => new Date(b.date) - new Date(a.date));
    const today = new Date().toISOString().split('T')[0];
    let streak = 0;
    
    for (let i = 0; i < sortedData.length; i++) {
        const entryDate = new Date(sortedData[i].date);
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);
        
        if (entryDate.toISOString().split('T')[0] === checkDate.toISOString().split('T')[0]) {
            streak++;
        } else {
            break;
        }
    }
    
    return streak;
}

// Calculate average mood
function calculateAverageMood() {
    if (moodData.length === 0) return '--';
    
    const sum = moodData.reduce((acc, entry) => acc + entry.mood, 0);
    const avg = sum / moodData.length;
    
    const moods = ['😢', '😔', '😐', '😊', '😄'];
    return moods[Math.round(avg) - 1] || '--';
}

// Calculate average energy
function calculateAverageEnergy() {
    if (moodData.length === 0) return '--';
    
    const sum = moodData.reduce((acc, entry) => acc + entry.energy, 0);
    const avg = (sum / moodData.length).toFixed(1);
    return avg + '/10';
}

// Create mood chart
function createMoodChart() {
    const ctx = document.getElementById('moodChart').getContext('2d');
    
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
                fill: true
            }, {
                label: 'Energy',
                data: [],
                borderColor: '#764ba2',
                backgroundColor: 'rgba(118, 75, 162, 0.1)',
                tension: 0.4,
                fill: false
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10
                }
            }
        }
    });
    
    updateMoodChart();
}

// Update mood chart
function updateMoodChart() {
    if (!moodChart || moodData.length === 0) return;
    
    const sortedData = moodData.sort((a, b) => new Date(a.date) - new Date(b.date));
    const last7Days = sortedData.slice(-7);
    
    const labels = last7Days.map(entry => {
        const date = new Date(entry.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    
    const moodValues = last7Days.map(entry => entry.mood * 2); // Scale to 10
    const energyValues = last7Days.map(entry => entry.energy);
    
    moodChart.data.labels = labels;
    moodChart.data.datasets[0].data = moodValues;
    moodChart.data.datasets[1].data = energyValues;
    moodChart.update();
}

// Update insights
function updateInsights() {
    const insightsContent = document.getElementById('insights-content');
    
    if (moodData.length < 3) {
        insightsContent.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <h3>🌱 Keep tracking to unlock insights!</h3>
                <p>Add at least 3 entries to see your patterns and trends.</p>
                <p>Current entries: <strong>${moodData.length}/3</strong></p>
            </div>
        `;
        return;
    }
    
    const insights = generateInsights();
    insightsContent.innerHTML = `
        <div class="insights-grid">
            ${insights.map(insight => `
                <div class="insight-card">
                    <div class="insight-icon">${insight.icon}</div>
                    <h3>${insight.title}</h3>
                    <p>${insight.description}</p>
                </div>
            `).join('')}
        </div>
    `;
}

// Generate insights
function generateInsights() {
    const insights = [];
    
    // Best mood days
    const avgMoodByDay = {};
    moodData.forEach(entry => {
        const day = new Date(entry.date).getDay();
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day];
        if (!avgMoodByDay[dayName]) {
            avgMoodByDay[dayName] = { total: 0, count: 0 };
        }
        avgMoodByDay[dayName].total += entry.mood;
        avgMoodByDay[dayName].count++;
    });
    
    let bestDay = null;
    let bestAvg = 0;
    for (const day in avgMoodByDay) {
        const avg = avgMoodByDay[day].total / avgMoodByDay[day].count;
        if (avg > bestAvg) {
            bestAvg = avg;
            bestDay = day;
        }
    }
    
    if (bestDay) {
        insights.push({
            icon: '📅',
            title: 'Best Day',
            description: `${bestDay}s are your best days! Average mood: ${bestAvg.toFixed(1)}/5`
        });
    }
    
    // Activity correlation
    const activityImpact = {};
    moodData.forEach(entry => {
        entry.activities.forEach(activity => {
            if (!activityImpact[activity]) {
                activityImpact[activity] = { total: 0, count: 0 };
            }
            activityImpact[activity].total += entry.mood;
            activityImpact[activity].count++;
        });
    });
    
    let bestActivity = null;
    let bestActivityAvg = 0;
    for (const activity in activityImpact) {
        const avg = activityImpact[activity].total / activityImpact[activity].count;
        if (avg > bestActivityAvg && activityImpact[activity].count >= 2) {
            bestActivityAvg = avg;
            bestActivity = activity;
        }
    }
    
    if (bestActivity) {
        const activityEmojis = {
            exercise: '🏃‍♂️',
            study: '📚',
            social: '👥',
            gaming: '🎮',
            music: '🎵',
            nature: '🌿',
            rest: '😴',
            food: '🍕'
        };
        
        insights.push({
            icon: activityEmojis[bestActivity] || '⭐',
            title: 'Mood Booster',
            description: `${bestActivity.charAt(0).toUpperCase() + bestActivity.slice(1)} activities boost your mood the most!`
        });
    }
    
    // Streak motivation
    const streak = calculateStreak();
    if (streak >= 3) {
        insights.push({
            icon: '🔥',
            title: 'Great Streak!',
            description: `You've tracked your mood for ${streak} days straight. Keep it up!`
        });
    }
    
    return insights;
}

// Update journal
function updateJournal() {
    const journalEntries = document.getElementById('journal-entries');
    
    const entriesWithNotes = moodData.filter(entry => entry.notes && entry.notes.trim());
    
    if (entriesWithNotes.length === 0) {
        journalEntries.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <h3>📝 Your journal is empty</h3>
                <p>Add notes to your mood entries to create your personal journal!</p>
            </div>
        `;
        return;
    }
    
    const sortedEntries = entriesWithNotes.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    journalEntries.innerHTML = sortedEntries.map(entry => {
        const date = new Date(entry.date);
        const formattedDate = date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        const moodEmojis = ['😢', '😔', '😐', '😊', '😄'];
        
        return `
            <div class="journal-entry">
                <div class="journal-header">
                    <h3>${formattedDate}</h3>
                    <div class="journal-mood">
                        <span class="mood-emoji">${moodEmojis[entry.mood - 1]}</span>
                        <span>Energy: ${entry.energy}/10</span>
                    </div>
                </div>
                <div class="journal-content">
                    <p>${entry.notes}</p>
                </div>
                ${entry.activities.length > 0 ? `
                    <div class="journal-activities">
                        <strong>Activities:</strong> ${entry.activities.join(', ')}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}
