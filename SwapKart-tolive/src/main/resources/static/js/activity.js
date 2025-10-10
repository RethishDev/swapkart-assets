// Activity types and their corresponding icons and colors
const ACTIVITY_TYPES = {
    ITEM_ADDED: { 
        icon: 'plus-circle', 
        color: 'primary',
        getDescription: (activity) => `You added "${activity.itemTitle || 'an item'}"`
    },
    ITEM_UPDATED: { 
        icon: 'edit', 
        color: 'info',
        getDescription: (activity) => `You updated "${activity.itemTitle || 'an item'}"`
    },
    ITEM_DELETED: { 
        icon: 'trash', 
        color: 'danger',
        getDescription: (activity) => `You deleted "${activity.itemTitle || 'an item'}"`
    },
    TRADE_REQUESTED: { 
        icon: 'exchange-alt', 
        color: 'warning',
        getDescription: (activity) => `You requested a trade for "${activity.itemTitle || 'an item'}"`
    },
    TRADE_ACCEPTED: { 
        icon: 'check-circle', 
        color: 'success',
        getDescription: (activity) => `Trade accepted for "${activity.itemTitle || 'an item'}"`
    },
    TRADE_REJECTED: { 
        icon: 'times-circle', 
        color: 'danger',
        getDescription: (activity) => `Trade rejected for "${activity.itemTitle || 'an item'}"`
    },
    MESSAGE_RECEIVED: { 
        icon: 'envelope', 
        color: 'info',
        getDescription: (activity) => `New message about "${activity.itemTitle || 'your item'}"`
    }
};

// Load recent activities
async function loadRecentActivities(containerId = 'recentActivities', limit = 5) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Show loading state
    container.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading activities...</span>
            </div>
        </div>
    `;

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            container.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-sign-in-alt me-2"></i>
                    Please sign in to view recent activities.
                </div>
            `;
            return;
        }

        const response = await fetch(`/api/activities/recent?limit=${limit}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'same-origin'
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || 'Failed to load activities';
            
            if (response.status === 401) {
                container.innerHTML = `
                    <div class="alert alert-warning">
                        <i class="fas fa-exclamation-circle me-2"></i>
                        Your session has expired. Please sign in again.
                    </div>
                `;
                // Redirect to login after a delay
                setTimeout(() => window.location.href = '/login', 2000);
                return;
            }
            
            throw new Error(errorMessage);
        }

        const activities = await response.json();
        
        if (!activities || activities.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4 text-muted">
                    <i class="fas fa-inbox fa-2x mb-3"></i>
                    <p class="mb-0">No recent activities found</p>
                </div>
            `;
            return;
        }
        
        renderActivities(activities, container);
    } catch (error) {
        console.error('Error loading activities:', error);
        container.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                ${error.message || 'Unable to load recent activities. Please try again later.'}
            </div>
        `;
    }
}

// Render activities in the container
function renderActivities(activities, container) {
    if (!activities || activities.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                <p class="text-muted">No recent activities found</p>
            </div>
        `;
        return;
    }

    const activitiesHtml = activities.map(activity => {
        const activityType = ACTIVITY_TYPES[activity.type] || {
            icon: 'info-circle',
            color: 'secondary',
            getDescription: (a) => a.description || 'New activity'
        };

        const description = activityType.getDescription(activity);
        const timeAgo = formatTimeAgo(activity.createdAt);

        return `
            <div class="activity-item">
                <div class="activity-icon bg-${activityType.color}-light text-${activityType.color}">
                    <i class="fas fa-${activityType.icon}"></i>
                </div>
                <div class="activity-details">
                    <h6>${description}</h6>
                    <small class="text-muted">
                        <i class="far fa-clock me-1"></i> ${timeAgo}
                    </small>
                </div>
                ${activity.itemId ? `
                    <a href="/item-details.html?id=${activity.itemId}" class="btn btn-sm btn-outline-${activityType.color} ms-auto">
                        View
                    </a>
                ` : ''}
            </div>
        `;
    }).join('');

    container.innerHTML = activitiesHtml;
}

// Format timestamp to relative time (e.g., "2 hours ago")
function formatTimeAgo(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };
    
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
        }
    }
    
    return 'Just now';
}

// Initialize activities when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    loadRecentActivities();
});
