// Initialize variables
let expenseChart;
let trendChart;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async function() {
    try {
        await utils.loadNavigation();
        await initializeExpenseTracker();
        setupExpenseCharts();
        updateRecentExpenses();
        loadQuickStats();
        calculateNetProfit();
    } catch (error) {
        console.error('Expense tracker initialization error:', error);
        utils.showNotification('Error initializing expense tracker', 'error');
    }
});

async function initializeExpenseTracker() {
    const savedRate = utils.getFromLocalStorage('kwhRate', 0.41);
    document.getElementById('kwhRate').value = savedRate;
    document.getElementById('currentRate').textContent = savedRate;
}

function saveKwhRate() {
    const rate = parseFloat(document.getElementById('kwhRate').value);
    if (isNaN(rate) || rate <= 0) {
        utils.showNotification('Please enter a valid rate', 'error');
        return;
    }
    
    utils.saveToLocalStorage('kwhRate', rate);
    document.getElementById('currentRate').textContent = rate;
    utils.showNotification('Rate saved successfully!', 'success');
    calculateNetProfit();
}

function calculateAndSaveExpense() {
    const expense = calculateExpenses();
    if (!expense) return;

    const expenses = utils.getFromLocalStorage('expenses', []);
    expenses.push(expense);
    utils.saveToLocalStorage('expenses', expenses);
    
    // Update UI
    setupExpenseCharts();
    updateRecentExpenses();
    loadQuickStats();
    calculateNetProfit();
    
    // Clear form
    clearExpenseForm();
    
    utils.showNotification('Expense saved successfully!', 'success');
}

function calculateExpenses() {
    const kwhRate = parseFloat(document.getElementById('kwhRate').value);
    const kwhUsed = parseFloat(document.getElementById('kwhUsed').value) || 0;
    const maintenanceCost = parseFloat(document.getElementById('maintenanceCost').value) || 0;
    
    if (kwhUsed === 0 && maintenanceCost === 0) {
        utils.showNotification('Please enter at least one expense', 'error');
        return null;
    }
    
    const chargingCost = kwhUsed * kwhRate;
    const totalExpenses = chargingCost + maintenanceCost;
    
    // Update quick stats display
    document.getElementById('chargingCost').textContent = utils.formatCurrency(chargingCost);
    document.getElementById('maintenanceCost').textContent = utils.formatCurrency(maintenanceCost);
    document.getElementById('totalExpenses').textContent = utils.formatCurrency(totalExpenses);

    return {
        date: new Date().toISOString(),
        kwhRate,
        kwhUsed,
        chargingCost,
        maintenanceCost,
        totalExpenses
    };
}

function calculateNetProfit() {
    const trips = utils.getFromLocalStorage('trips', []);
    const expenses = utils.getFromLocalStorage('expenses', []);
    
    const totalEarnings = trips.reduce((sum, trip) => sum + parseFloat(trip.totalRevenue), 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.totalExpenses, 0);
    const netProfit = totalEarnings - totalExpenses;
    
    document.getElementById('netProfit').textContent = utils.formatCurrency(netProfit);
    
    // Add color coding based on profit/loss
    const netProfitElement = document.getElementById('netProfit');
    if (netProfit > 0) {
        netProfitElement.classList.add('text-green-500');
        netProfitElement.classList.remove('text-red-500');
    } else {
        netProfitElement.classList.add('text-red-500');
        netProfitElement.classList.remove('text-green-500');
    }
}

function clearExpenseForm() {
    document.getElementById('kwhUsed').value = '';
    document.getElementById('maintenanceCost').value = '';
}

function setupExpenseCharts() {
    const expenses = utils.getFromLocalStorage('expenses', []);
    setupExpenseBreakdownChart(expenses);
    setupExpenseTrendChart(expenses);
}

function setupExpenseBreakdownChart(expenses) {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    const totals = calculateExpenseTotals(expenses);
    
    if (expenseChart) {
        expenseChart.destroy();
    }

    expenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Charging', 'Maintenance', 'Other'],
            datasets: [{
                data: [totals.charging, totals.maintenance, totals.other],
                backgroundColor: ['#3b82f6', '#10b981', '#8b5cf6']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.raw / total) * 100).toFixed(1);
                            return `${context.label}: ${utils.formatCurrency(context.raw)} (${percentage}%)`;
                        }
                    }
                }
            },
            cutout: '70%'
        }
    });
}

function setupExpenseTrendChart(expenses) {
    const ctx = document.getElementById('trendChart').getContext('2d');
    const { labels, data } = processExpenseTrendData(expenses);
    
    if (trendChart) {
        trendChart.destroy();
    }

    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Daily Expenses',
                data,
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
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

function calculateExpenseTotals(expenses) {
    return expenses.reduce((acc, expense) => {
        acc.charging += expense.chargingCost;
        acc.maintenance += expense.maintenanceCost;
        acc.other += expense.otherCost;
        return acc;
    }, { charging: 0, maintenance: 0, other: 0 });
}

function processExpenseTrendData(expenses) {
    const dailyExpenses = {};
    
    // Create array of last 7 days in reverse order
    const last7Days = Array.from({length: 7}, (_, i) => {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - (6 - i));
        return date;
    });

    // Initialize expenses for each day
    last7Days.forEach(date => {
        dailyExpenses[date.toLocaleDateString()] = 0;
    });
    
    // Group expenses by date
    expenses.forEach(expense => {
        const expenseDate = new Date(expense.date);
        expenseDate.setHours(0, 0, 0, 0);
        
        if (expenseDate >= last7Days[0] && expenseDate <= last7Days[6]) {
            const dateStr = expenseDate.toLocaleDateString();
            if (dailyExpenses.hasOwnProperty(dateStr)) {
                dailyExpenses[dateStr] += expense.totalExpenses;
            }
        }
    });

    return {
        labels: Object.keys(dailyExpenses).map(date => new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })),
        data: Object.values(dailyExpenses)
    };
}

function updateRecentExpenses() {
    const expenses = utils.getFromLocalStorage('expenses', []);
    const recentExpensesList = document.getElementById('recentExpensesList');
    
    if (expenses.length === 0) {
        recentExpensesList.innerHTML = `
            <div class="text-center text-gray-500 dark:text-gray-400 py-8">
                <i class="fas fa-receipt text-4xl mb-2"></i>
                <p>No expenses recorded yet</p>
            </div>
        `;
        return;
    }

    const recentExpenses = expenses.slice(-5).reverse();
    recentExpensesList.innerHTML = recentExpenses.map(expense => `
        <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div class="flex items-center gap-3">
                <div class="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                    <i class="fas fa-receipt text-purple-500"></i>
                </div>
                <div>
                    <p class="font-medium">${utils.formatDate(expense.date)}</p>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                        ${expense.kwhUsed > 0 ? `${expense.kwhUsed} kWh used` : 'Maintenance/Other'}
                    </p>
                </div>
            </div>
            <div class="text-right">
                <p class="font-bold text-purple-600 dark:text-purple-400">
                    ${utils.formatCurrency(expense.totalExpenses)}
                </p>
            </div>
        </div>
    `).join('');
}

function loadQuickStats() {
    const expenses = utils.getFromLocalStorage('expenses', []);
    const today = new Date();
    
    const todayExpenses = expenses
        .filter(expense => utils.isSameDay(new Date(expense.date), today))
        .reduce((sum, expense) => sum + expense.totalExpenses, 0);
        
    const weekExpenses = expenses
        .filter(expense => utils.isThisWeek(new Date(expense.date)))
        .reduce((sum, expense) => sum + expense.totalExpenses, 0);
        
    const monthExpenses = expenses
        .filter(expense => utils.isSameMonth(new Date(expense.date), today))
        .reduce((sum, expense) => sum + expense.totalExpenses, 0);

    document.getElementById('todayExpenses').textContent = utils.formatCurrency(todayExpenses);
    document.getElementById('weekExpenses').textContent = utils.formatCurrency(weekExpenses);
    document.getElementById('monthExpenses').textContent = utils.formatCurrency(monthExpenses);
}

function exportExpenses() {
    const expenses = utils.getFromLocalStorage('expenses', []);
    const csv = generateExpenseCSV(expenses);
    downloadCSV(csv, 'expense_history.csv');
    utils.showNotification('Expenses exported successfully!', 'success');
}

function generateExpenseCSV(expenses) {
    const headers = 'Date,kWh Rate,kWh Used,Charging Cost,Maintenance Cost,Other Cost,Total Expenses\n';
    const rows = expenses.map(expense => 
        `${expense.date},${expense.kwhRate},${expense.kwhUsed},${expense.chargingCost},` +
        `${expense.maintenanceCost},${expense.otherCost},${expense.totalExpenses}`
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
    if (expenseChart) {
        expenseChart.resize();
    }
    if (trendChart) {
        trendChart.resize();
    }
});
