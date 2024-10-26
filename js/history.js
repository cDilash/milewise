// Initialize variables
let earningsChart;
let tripsChart;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async function() {
    try {
        await initializeTripHistory();
        setupHistoryCharts();
        updateQuickStats();
    } catch (error) {
        console.error('Trip history initialization error:', error);
        utils.showNotification('Error initializing trip history', 'error');
    }
});

async function initializeTripHistory() {
    const trips = utils.getFromLocalStorage('trips', []);
    updateTripList(trips);
}

function updateQuickStats() {
    const trips = utils.getFromLocalStorage('trips', []);
    const stats = calculateHistoryStats(trips);
    
    document.getElementById('totalEarnings').textContent = utils.formatCurrency(stats.totalEarnings);
    document.getElementById('totalTrips').textContent = stats.totalTrips;
    document.getElementById('totalDistance').textContent = `${stats.totalDistance.toFixed(1)} mi`;
    document.getElementById('totalPassengers').textContent = stats.totalPassengers;
}

function calculateHistoryStats(trips) {
    return {
        totalTrips: trips.length,
        totalEarnings: trips.reduce((sum, trip) => sum + parseFloat(trip.totalRevenue), 0),
        totalDistance: trips.reduce((sum, trip) => sum + parseFloat(trip.totalDistance), 0),
        totalPassengers: trips.reduce((sum, trip) => sum + trip.passengers.length, 0)
    };
}

function setupHistoryCharts() {
    const trips = utils.getFromLocalStorage('trips', []);
    setupEarningsChart(trips);
    setupTripsChart(trips);
}

function setupEarningsChart(trips) {
    const ctx = document.getElementById('earningsChart').getContext('2d');
    const { labels, data } = processEarningsData(trips);
    
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

function setupTripsChart(trips) {
    const ctx = document.getElementById('tripsChart').getContext('2d');
    const { labels, data } = processTripsData(trips);
    
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

function processEarningsData(trips) {
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
    trips.forEach(trip => {
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

function processTripsData(trips) {
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
    trips.forEach(trip => {
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

function updateTripList(trips) {
    const tripsList = document.getElementById('tripsList');
    
    if (trips.length === 0) {
        tripsList.innerHTML = `
            <div class="text-center text-gray-500 dark:text-gray-400 py-8">
                <i class="fas fa-history text-4xl mb-2"></i>
                <p>No trips recorded yet</p>
            </div>
        `;
        return;
    }

    tripsList.innerHTML = trips.reverse().map(trip => `
        <div class="trip-card bg-white dark:bg-gray-700 rounded-lg shadow-sm p-4 hover:shadow-md transition-all">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h3 class="text-lg font-semibold">${utils.formatDate(trip.date)}</h3>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                        ${trip.passengers.length} passenger${trip.passengers.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <div class="text-right">
                    <p class="text-lg font-bold text-green-500">${utils.formatCurrency(trip.totalRevenue)}</p>
                    <p class="text-sm text-gray-500 dark:text-gray-400">${trip.totalDistance} miles</p>
                </div>
            </div>
            <div class="space-y-2">
                ${trip.passengers.map((passenger, index) => `
                    <div class="passenger-row flex items-center gap-2 text-sm p-2 bg-gray-50 dark:bg-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors">
                        <i class="fas fa-user-circle text-gray-400"></i>
                        <span class="flex-1">${passenger.name || `Passenger ${index + 1}`}</span>
                        <span class="text-gray-500 dark:text-gray-400">${passenger.distance} mi</span>
                        <span class="text-green-500">${utils.formatCurrency(passenger.cost)}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

function filterTrips() {
    const searchTerm = document.getElementById('searchTrips').value.toLowerCase();
    const filterPeriod = document.getElementById('filterPeriod').value;
    const trips = utils.getFromLocalStorage('trips', []);

    const filteredTrips = trips.filter(trip => {
        const tripDate = new Date(trip.date);
        const today = new Date();
        
        // Period filter
        let passesDateFilter = true;
        if (filterPeriod === 'today') {
            passesDateFilter = utils.isSameDay(tripDate, today);
        } else if (filterPeriod === 'week') {
            passesDateFilter = utils.isThisWeek(tripDate);
        } else if (filterPeriod === 'month') {
            passesDateFilter = utils.isSameMonth(tripDate, today);
        }

        // Search filter
        const searchInTrip = trip.passengers.some(passenger => 
            passenger.name.toLowerCase().includes(searchTerm) ||
            passenger.pickup.toLowerCase().includes(searchTerm) ||
            passenger.dropoff.toLowerCase().includes(searchTerm)
        );

        return passesDateFilter && (searchTerm === '' || searchInTrip);
    });

    updateTripList(filteredTrips);
}

function exportTripHistory() {
    const trips = utils.getFromLocalStorage('trips', []);
    const csv = generateTripCSV(trips);
    downloadCSV(csv, 'trip_history.csv');
    utils.showNotification('Trip history exported successfully!', 'success');
}

function generateTripCSV(trips) {
    const headers = 'Date,Total Distance,Total Revenue,Passenger Name,Pickup,Dropoff,Distance,Cost\n';
    const rows = trips.flatMap(trip => 
        trip.passengers.map(passenger => 
            `${trip.date},${trip.totalDistance},${trip.totalRevenue},` +
            `${passenger.name},${passenger.pickup},${passenger.dropoff},` +
            `${passenger.distance},${passenger.cost}`
        )
    ).join('\n');
    return headers + rows;
}

function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
