document.addEventListener('DOMContentLoaded', function() {
    // Initialize dashboard
    loadDashboardData();
    setupEventListeners();
});

let userGrowthChart;
let itemDistributionChart;

async function loadDashboardData() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login.html';
            return;
        }

        const response = await fetch('/api/admin/dashboard/stats', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login.html';
            return;
        }

        if (!response.ok) {
            throw new Error('Failed to load dashboard data');
        }

        const data = await response.json();
        updateDashboardStats(data);
        renderCharts(data);
        // loadRecentActivity(); // Uncomment when activity endpoint is ready

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showError('Failed to load dashboard data. Please try again.');
    }
}

function updateDashboardStats(stats) {
    // Update user stats
    document.getElementById('totalUsers').textContent = stats.totalUsers.toLocaleString();
    document.getElementById('newUsersToday').innerHTML = `
        <i class="fas fa-arrow-up me-1"></i>${stats.newUsersToday} today
    `;
    document.getElementById('newUsersThisMonth').textContent = `${stats.newUsersThisMonth} this month`;

    // Update item stats
    document.getElementById('totalItems').textContent = stats.totalItems.toLocaleString();
    document.getElementById('newItemsToday').innerHTML = `
        <i class="fas fa-arrow-up me-1"></i>${stats.newItemsToday} today
    `;
    document.getElementById('activeItems').textContent = `${stats.activeItems} active`;
    document.getElementById('pendingItems').textContent = stats.pendingItems;
}

function renderCharts(stats) {
    // User Growth Chart
    const userCtx = document.getElementById('userGrowthChart').getContext('2d');
    const userGrowthData = {
        labels: Object.keys(stats.userGrowth),
        datasets: [{
            label: 'New Users',
            data: Object.values(stats.userGrowth),
            backgroundColor: 'rgba(78, 115, 223, 0.05)',
            borderColor: 'rgba(78, 115, 223, 1)',
            pointBackgroundColor: 'rgba(78, 115, 223, 1)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(78, 115, 223, 1)',
            pointRadius: 3,
            pointHoverRadius: 5,
            fill: true,
            tension: 0.3
        }]
    };

    if (userGrowthChart) {
        userGrowthChart.destroy();
    }

    userGrowthChart = new Chart(userCtx, {
        type: 'line',
        data: userGrowthData,
        options: {
            maintainAspectRatio: false,
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleFont: {
                        size: 14
                    },
                    bodyFont: {
                        size: 14
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        drawBorder: false
                    },
                    ticks: {
                        precision: 0
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });

    // Item Distribution Chart
    const itemCtx = document.getElementById('itemDistributionChart').getContext('2d');
    const itemData = {
        labels: ['Active', 'Pending', 'Rejected'],
        datasets: [{
            data: [stats.activeItems, stats.pendingItems, 0], // Add rejected count if available
            backgroundColor: ['#4e73df', '#f6c23e', '#e74a3b'],
            hoverBackgroundColor: ['#2e59d9', '#dda20a', '#be2617'],
            hoverBorderColor: 'rgba(234, 236, 244, 1)',
        }]
    };

    if (itemDistributionChart) {
        itemDistributionChart.destroy();
    }

    itemDistributionChart = new Chart(itemCtx, {
        type: 'doughnut',
        data: itemData,
        options: {
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            cutout: '70%'
        }
    });
}

function setupEventListeners() {
    // Navigation
    document.getElementById('dashboardLink').addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = '/admin-dashboard.html';
    });

    document.getElementById('usersLink').addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = '/admin-users.html';
    });

    document.getElementById('itemsLink').addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = '/admin-items.html';
    });

    document.getElementById('tradesLink').addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = '/admin-transactions.html';
    });

    document.getElementById('messagesLink').addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = '/admin-messages.html';
    });

    // Chart period toggles
    document.getElementById('userChartDay').addEventListener('click', (e) => {
        e.preventDefault();
        // Implement day view
    });

    document.getElementById('userChartWeek').addEventListener('click', (e) => {
        e.preventDefault();
        // Implement week view
    });

    document.getElementById('userChartMonth').addEventListener('click', (e) => {
        e.preventDefault();
        // Implement month view
    });
}

function showError(message) {
    // Implement error toast/notification
    console.error(message);
    alert(message); // Replace with a proper notification system
}

// Export functions that need to be called from HTML
window.loadDashboardData = loadDashboardData;