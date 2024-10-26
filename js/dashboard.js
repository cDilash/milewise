// dashboard.js
let workTimer;
let workStartTime;
let isDarkMode = localStorage.getItem('darkMode') === 'true';
let earningsChart;
let tripsChart;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async function() {
    try {
        await initializeDashboard();
        setupCharts();
        updateRealtimeStats();
        initializeWorkTimer();
        // Update stats every minute
        setInterval(updateRealtimeStats, 60000);
    } catch (error) {
        console.error('Dashboard initialization error:', error);
        utils.showNotification('Error initializing dashboard', 'error');
    }
});

async function initializeDashboard() {
    const earnings = utils.getFromLocalStorage('trips', []);
    const workHours = utils.getFromLocalStorage('workHours', []);
    
    // Calculate statistics
    const stats = calculateDashboardStats(earnings, workHours);
    
    // Update quick stats display
    updateQuickStats(stats);
    
    // Update activity feed
    updateActivityFeed(earnings);
}

function calculateDashboardStats(earnings, workHours) {
    const today = new Date();
    const todayStr = today.toLocaleDateString();

    // Calculate total earnings
    const totalEarnings = earnings.reduce((sum, trip) => sum + parseFloat(trip.totalRevenue), 0);
    
    // Calculate today's earnings
    const todayEarnings = earnings
        .filter(trip => new Date(trip.date).toLocaleDateString() === todayStr)
        .reduce((sum, trip) => sum + parseFloat(trip.totalRevenue), 0);

    // Calculate total hours worked
    const totalHours = workHours.reduce((sum, session) => sum + session.duration, 0) / 3600000; // Convert ms to hours

    return {
        totalEarnings,
        todayEarnings,
        totalTrips: earnings.length,
        avgPerHour: totalHours > 0 ? totalEarnings / totalHours : 0,
        totalHours
    };
}

function updateQuickStats(stats) {
    document.getElementById('todayEarnings').textContent = utils.formatCurrency(stats.todayEarnings);
    document.getElementById('totalTrips').textContent = stats.totalTrips;
    document.getElementById('avgPerHour').textContent = utils.formatCurrency(stats.avgPerHour);
}

function setupCharts() {
    const earnings = utils.getFromLocalStorage('trips', []);
    
    // Setup earnings trend chart
    setupEarningsTrendChart(earnings);
    
    // Setup trips distribution chart
    setupTripsChart(earnings);
}

function setupEarningsTrendChart(earnings) {
    const ctx = document.getElementById('earningsChart').getContext('2d');
    const { labels, data } = processEarningsData(earnings);
    
    if (earningsChart) {
        earningsChart.destroy();
    }

    earningsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Daily Earnings',
                data,
                borderColor: '#4F46E5',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return utils.formatCurrency(context.raw);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => utils.formatCurrency(value)
                    }
                }
            }
        }
    });
}

function setupTripsChart(earnings) {
    const ctx = document.getElementById('tripsChart').getContext('2d');
    const { labels, data } = processTripsData(earnings);
    
    if (tripsChart) {
        tripsChart.destroy();
    }

    tripsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Number of Trips',
                data,
                backgroundColor: '#8B5CF6'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function processEarningsData(earnings) {
    const dailyEarnings = {};
    const last7Days = [];
    
    // Get last 7 days
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        last7Days.push(date.toLocaleDateString());
        dailyEarnings[date.toLocaleDateString()] = 0;
    }
    
    // Group earnings by date
    earnings.forEach(trip => {
        const date = new Date(trip.date).toLocaleDateString();
        if (dailyEarnings.hasOwnProperty(date)) {
            dailyEarnings[date] += parseFloat(trip.totalRevenue);
        }
    });

    return {
        labels: Object.keys(dailyEarnings),
        data: Object.values(dailyEarnings)
    };
}

function processTripsData(earnings) {
    const dailyTrips = {};
    const last7Days = [];
    
    // Get last 7 days
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        last7Days.push(date.toLocaleDateString());
        dailyTrips[date.toLocaleDateString()] = 0;
    }
    
    // Count trips by date
    earnings.forEach(trip => {
        const date = new Date(trip.date).toLocaleDateString();
        if (dailyTrips.hasOwnProperty(date)) {
            dailyTrips[date]++;
        }
    });

    return {
        labels: Object.keys(dailyTrips),
        data: Object.values(dailyTrips)
    };
}

function updateActivityFeed(earnings) {
    const activityFeed = document.getElementById('activityFeed');
    const recentTrips = earnings.slice(-5).reverse();
    
    if (recentTrips.length === 0) {
        activityFeed.innerHTML = `
            <div class="text-center text-gray-500 dark:text-gray-400 py-8">
                <i class="fas fa-history text-4xl mb-2"></i>
                <p>No recent activity</p>
            </div>
        `;
        return;
    }

    activityFeed.innerHTML = recentTrips.map(trip => `
        <div class="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div class="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                <i class="fas fa-car text-blue-500"></i>
            </div>
            <div class="flex-1">
                <p class="font-medium">${utils.formatDate(trip.date)}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                    ${trip.passengers.length} passenger${trip.passengers.length !== 1 ? 's' : ''} • ${trip.totalDistance} miles
                </p>
            </div>
            <div class="text-right">
                <p class="font-bold text-green-500">${utils.formatCurrency(trip.totalRevenue)}</p>
            </div>
        </div>
    `).join('');
}

// Work Timer Functions
function initializeWorkTimer() {
    const workSession = utils.getFromLocalStorage('currentWorkSession', null);
    if (workSession && workSession.startTime) {
        workStartTime = new Date(workSession.startTime);
        startWorkTimer();
        document.getElementById('startWorkBtn').disabled = true;
        document.getElementById('endWorkBtn').disabled = false;
    }
}

function startWork() {
    workStartTime = new Date();
    utils.saveToLocalStorage('currentWorkSession', { startTime: workStartTime });
    startWorkTimer();
    document.getElementById('startWorkBtn').disabled = true;
    document.getElementById('endWorkBtn').disabled = false;
    utils.showNotification('Work session started', 'success');
}

function endWork() {
    if (!workStartTime) return;
    
    const endTime = new Date();
    const duration = endTime - workStartTime;
    
    // Save work session
    const workHours = utils.getFromLocalStorage('workHours', []);
    workHours.push({
        startTime: workStartTime,
        endTime: endTime,
        duration: duration
    });
    utils.saveToLocalStorage('workHours', workHours);
    
    // Clear current session
    localStorage.removeItem('currentWorkSession');
    clearInterval(workTimer);
    workStartTime = null;
    
    // Reset UI
    document.getElementById('currentWorkTime').textContent = '00:00:00';
    document.getElementById('startWorkBtn').disabled = false;
    document.getElementById('endWorkBtn').disabled = true;
    
    utils.showNotification('Work session saved successfully!', 'success');
    updateRealtimeStats();
}

function startWorkTimer() {
    workTimer = setInterval(updateWorkTimer, 1000);
}

function updateWorkTimer() {
    if (!workStartTime) return;
    
    const now = new Date();
    const diff = now - workStartTime;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    document.getElementById('currentWorkTime').textContent = 
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function updateRealtimeStats() {
    const earnings = utils.getFromLocalStorage('trips', []);
    const workHours = utils.getFromLocalStorage('workHours', []);
    const stats = calculateDashboardStats(earnings, workHours);
    updateQuickStats(stats);
    setupCharts();
    updateActivityFeed(earnings);
}

// Window resize handler
window.addEventListener('resize', function() {
    if (earningsChart) {
        earningsChart.resize();
    }
    if (tripsChart) {
        tripsChart.resize();
    }
});
