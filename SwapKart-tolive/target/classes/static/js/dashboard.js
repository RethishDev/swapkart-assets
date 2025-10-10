// Dashboard functionality
class Dashboard {
    constructor() {
        this.user = null;
        this.init();
    }

    async init() {
        this.checkAuth();
        await this.loadUserData();
        this.setupEventListeners();
        this.loadRecentActivity();
        this.updateDashboardStats();
        this.updateBadges();
    }

    checkAuth() {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }
    }

    async loadUserData() {
        try {
            const response = await fetch('/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load user data');
            }

            this.user = await response.json();
            this.updateUserUI();
        } catch (error) {
            console.error('Error loading user data:', error);
            this.showToast('Error loading user data', 'error');
        }
    }

    updateUserUI() {
        if (!this.user) return;

        // Update user name in top right
        const userNameElements = document.querySelectorAll('#userName, .user-name');
        userNameElements.forEach(el => {
            el.textContent = this.user.name || this.user.email.split('@')[0];
        });

        // Update user avatar
        const avatarElements = document.querySelectorAll('.user-avatar');
        avatarElements.forEach(el => {
            if (!el.src.includes('ui-avatars.com')) return;
            const name = encodeURIComponent(this.user.name || this.user.email);
            el.src = `https://ui-avatars.com/api/?name=${name}&background=4361ee&color=fff`;
        });
    }

    async loadRecentActivity() {
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Mock data - replace with actual API call
            const activities = [
            ];

            this.renderActivities(activities);
        } catch (error) {
            console.error('Error loading recent activity:', error);
            this.showToast('Error loading recent activity', 'error');
        }
    }

    renderActivities(activities) {
        const container = document.getElementById('recentActivity');
        if (!container) return;

        if (!activities || activities.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No recent activity</p>
                </div>
            `;
            return;
        }

        const activitiesHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-${activity.icon}"></i>
                </div>
                <div class="activity-details">
                    <h6 class="mb-0">${activity.message}</h6>
                    <small>${activity.time}</small>
                </div>
            </div>
        `).join('');

        container.innerHTML = activitiesHTML;
    }

    async updateDashboardStats() {
        try {
            // Get the authentication token
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = '/login.html';
                return;
            }

            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };

            // Fetch all stats in parallel
            const [itemsResponse, unreadResponse] = await Promise.all([
                fetch('/api/items/my/count', { headers }),
                fetch('/api/notifications/unread/count', { headers })
            ]);

            if (!itemsResponse.ok) {
                throw new Error('Failed to fetch items count');
            }

            const totalItems = await itemsResponse.json();
            let unreadCount = 0;

            // Only parse unread count if the request was successful
            if (unreadResponse.ok) {
                const unreadData = await unreadResponse.json();
                unreadCount = unreadData.count || 0;
            }

            // Update stats cards with actual data
            document.getElementById('itemsCount').textContent = totalItems;
            document.getElementById('notificationsCount').textContent = unreadCount;

            // Update the notification badges in the UI
            this.updateNotificationBadges(unreadCount);

        } catch (error) {
            console.error('Error loading dashboard stats:', error);
            this.showToast('Error loading dashboard statistics', 'error');
        }
    }

    // Helper method to update notification badges throughout the UI
    updateNotificationBadges(count) {
        // Update the main notification badge in the header
        const notificationBadges = document.querySelectorAll('.notification-badge');
        notificationBadges.forEach(badge => {
            if (count > 0) {
                badge.textContent = count;
                badge.style.display = 'inline-flex';
            } else {
                badge.style.display = 'none';
            }
        });

        // Update the messages count in the sidebar
        const messageBadges = document.querySelectorAll('.message-badge');
        messageBadges.forEach(badge => {
            if (count > 0) {
                badge.textContent = count;
                badge.style.display = 'inline-flex';
            } else {
                badge.style.display = 'none';
            }
        });
    }

    updateBadges() {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Update messages badge
        fetch('/api/messages/unread/count', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            const messageBadges = document.querySelectorAll('.message-badge');
            messageBadges.forEach(badge => {
                if (data.count > 0) {
                    badge.textContent = data.count;
                    badge.style.display = 'inline-block';
                } else {
                    badge.style.display = 'none';
                }
            });
        });

        // Update notifications badge
        fetch('/api/notifications/unread/count', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            const notificationBadges = document.querySelectorAll('.notification-badge');
            notificationBadges.forEach(badge => {
                if (data.count > 0) {
                    badge.textContent = data.count;
                    badge.style.display = 'inline-block';
                } else {
                    badge.style.display = 'none';
                }
            });
        });
    }

    setupEventListeners() {
        // Sidebar toggle for mobile
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                document.querySelector('.sidebar').classList.toggle('active');
            });
        }

        // Logout button
        const logoutButtons = document.querySelectorAll('.logout-btn');
        logoutButtons.forEach(button => {
            button.addEventListener('click', this.handleLogout.bind(this));
        });

        // Search functionality
        const searchInput = document.querySelector('.search-bar input');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const query = e.target.value.trim();
                    if (query) {
                        window.location.href = `/items.html?search=${encodeURIComponent(query)}`;
                    }
                }
            });
        }
    }

    handleLogout(e) {
        e.preventDefault();
        // Clear local storage
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('role');

        // Redirect to login page
        window.location.href = 'login.html';
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');

        if (!toast || !toastMessage) return;

        // Set message and type
        toastMessage.textContent = message;

        // Set background color based on type
        const toastElement = bootstrap.Toast.getOrCreateInstance(toast);

        // Update toast class based on type
        toast.className = 'toast align-items-center text-white border-0';

        if (type === 'error') {
            toast.classList.add('bg-danger');
        } else if (type === 'success') {
            toast.classList.add('bg-success');
        } else {
            toast.classList.add('bg-primary');
        }

        // Show the toast
        toastElement.show();
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const dashboard = new Dashboard();
    window.dashboard = dashboard; // Make it available globally if needed
    setInterval(dashboard.updateBadges.bind(dashboard), 30000);
});
