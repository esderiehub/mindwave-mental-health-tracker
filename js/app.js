// Global variables
let moodData = JSON.parse(localStorage.getItem('moodData')) || [];
let journalEntries = JSON.parse(localStorage.getItem('journalEntries')) || [];
let selectedMood = null;
let selectedActivities = [];
let moodChart = null;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    updateDashboard();
    initializeChart();
});

// Navigation functionality
function switchToTab(tabName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show target section
    document.getElementById(tabName).classList.add('active');
    
    // Update nav buttons
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchToTab(tabName);
        });
    });

    // Mood selection
    document.querySelectorAll('.mood-option').forEach(option => {
        option.addEventListener('click', function() {
            selectedMood = parseInt(this.getAttribute('data-value'));
            
            // Update UI
            document.querySelectorAll('.mood-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            this.classList.add('selected');
        });
    });

    // Activity selection
    document.querySelectorAll('.tag').forEach(tag => {
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
    const energySlider = document.getElementById('energy-slider');
    const energyValue = document.getElementById('energy-value');
    
    energySlider.addEventListener('input', function() {
        energyValue.textContent = this.value;
    });

    // Form submission
    document.getElementById('mood-form').addEventListener('submit', function(e) {
        e.preventDefault();
        saveMoodEntry();
    });
}

// Initialize app
function initializeApp() {
    // Set today's date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('mood-date').value = today;
}

// Save mood entry
function saveMoodEntry() {
    if (selectedMood === null) {
        alert('Please select a mood!');
        return;
    }

    const entry = {
        id: Date.now(),
        date: document.getElementById('mood-date').value,
        mood: selectedMood,
        energy: parseInt(document.getElementById('energy-slider').value),
        activities: [...selectedActivities],
        notes: document.getElementById('mood-notes').value,
        timestamp: new Date().toISOString()
    };

    moodData.push(entry);
    localStorage.setItem('moodData', JSON.stringify(moodData));

    // Reset form
    resetMoodForm();
    
    // Update dashboard
    updateDashboard();
    updateChart();
    
    // Show success message
    alert('Mood entry saved successfully! 🎉');
    
    // Switch to dashboard
    switchToTab('dashboard');
}

// Reset mood form
function resetMoodForm() {
    selectedMood = null;
    selectedActivities = [];
    
    document.querySelectorAll('.mood-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    document.querySelectorAll('.tag').forEach(tag => {
        tag.classList.remove('selected');
    });
    
    document.getElementById('energy-slider').value = 5;
    document.getElementById('energy-value').textContent = 5;
    document.getElementById('mood-notes').value = '';
}

// Update dashboard statistics
function updateDashboard() {
    const totalEntries = moodData.length;
    document.getElementById('total-entries').textContent = totalEntries;
    
    if (totalEntries > 0) {
        // Calculate streak
        const streak = calculateStreak();
        document.getElementById('current-streak').textContent = streak;
        
        // Calculate averages
        const avgMood = (moodData.reduce((sum, entry) => sum + entry.mood, 0) / totalEntries).toFixed(1);
        const avgEnergy = (moodData.reduce((sum, entry) => sum + entry.energy, 0) / totalEntries).toFixed(1);
        
        document.getElementById('avg-mood').textContent = avgMood;
        document.getElementById('avg-energy').textContent = avgEnergy;
    }
}

// Calculate streak
function calculateStreak() {
    if (moodData.length === 0) return 0;
    
    const sortedData = moodData.sort((a, b) => new Date(b.date) - new Date(a.date));
    const today = new Date().toISOString().split('T')[0];
    let streak = 0;
    let currentDate = today;
    
    for (let entry of sortedData) {
        if (entry.date === currentDate) {
            streak++;
            const date = new Date(currentDate);
            date.setDate(date.getDate() - 1);
            currentDate = date.toISOString().split('T')[0];
        } else {
            break;
        }
    }
    
    return streak;
}

// Initialize chart
function initializeChart() {
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
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10
                }
            },
            plugins: {
                legend: {
                    display: true
                }
            }
        }
    });
    
    updateChart();
}

// Update chart
function updateChart() {
    if (!moodChart || moodData.length === 0) return;
    
    const last7Days = moodData
        .slice(-7)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const labels = last7Days.map(entry => {
        const date = new Date(entry.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    
    const moodValues = last7Days.map(entry => entry.mood);
    const energyValues = last7Days.map(entry => entry.energy);
    
    moodChart.data.labels = labels;
    moodChart.data.datasets[0].data = moodValues;
    moodChart.data.datasets[1].data = energyValues;
    moodChart.update();
}

// Journal functions
function showJournalForm() {
    document.getElementById('journal-form').style.display = 'block';
}

function hideJournalForm() {
    document.getElementById('journal-form').style.display = 'none';
    document.getElementById('journal-title').value = '';
    document.getElementById('journal-content').value = '';
}

function saveJournalEntry() {
    const title = document.getElementById('journal-title').value;
    const content = document.getElementById('journal-content').value;
    
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
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        })
    };
    
    journalEntries.unshift(entry);
    localStorage.setItem('journalEntries', JSON.stringify(journalEntries));
    
    hideJournalForm();
    displayJournalEntries();
    
    alert('Journal entry saved! 📝');
}

function displayJournalEntries() {
    const container = document.getElementById('journal-entries');
    
    if (journalEntries.length === 0) {
        container.innerHTML = '<p class="empty-state">Your private thoughts and reflections will appear here.</p>';
        return;
    }
    
    const entriesHTML = journalEntries.map(entry => `
        <div class="journal-entry">
            <h3>${entry.title}</h3>
            <p class="entry-date">${entry.formattedDate}</p>
            <p class="entry-content">${entry.content}</p>
        </div>
    `).join('');
    
    container.innerHTML = entriesHTML;
}

// Load journal entries on page load
document.addEventListener('DOMContentLoaded', function() {
    displayJournalEntries();
});
