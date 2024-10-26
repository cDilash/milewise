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
        updateRealtimeStats();
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

function updateRealtimeStats() {
    const earnings = utils.getFromLocalStorage('trips', []);
    const workHours = utils.getFromLocalStorage('workHours', []);
    const stats = calculateDashboardStats(earnings, workHours);
    updateQuickStats(stats);
    updateActivityFeed(earnings);
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

// Window resize handler
window.addEventListener('resize', function() {
    if (earningsChart) {
        earningsChart.resize();
    }
    if (tripsChart) {
        tripsChart.resize();
    }
});
