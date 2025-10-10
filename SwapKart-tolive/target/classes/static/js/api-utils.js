// Utility function for making authenticated API requests
async function apiRequest(url, options = {}) {
    const token = localStorage.getItem('token');
    
    // Set default headers
    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers
    };
    
    // Add authorization header if token exists
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
        const response = await fetch(url, {
            ...options,
            headers,
            credentials: 'include' // Important for cookies/session
        });
        
        // Handle 401 Unauthorized
        if (response.status === 401) {
            // Clear local storage and redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            window.location.href = '/login.html';
            return null;
        }
        
        // Parse JSON response
        const data = await response.json().catch(() => ({}));
        
        if (!response.ok) {
            throw new Error(data.message || 'An error occurred');
        }
        
        return data;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// Check authentication status
function checkAuth() {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    
    // If no token, redirect to login
    if (!token && !window.location.pathname.includes('login')) {
        window.location.href = '/login.html';
        return false;
    }
    
    // If on login page but already authenticated, redirect based on role
    if (token && window.location.pathname.includes('login')) {
        window.location.href = role === 'ADMIN' ? 'admin-dashboard.html' : 'items.html';
        return false;
    }
    
    return true;
}

// Initialize authentication check when script loads
if (!window.location.pathname.includes('login') && !window.location.pathname.includes('register')) {
    document.addEventListener('DOMContentLoaded', checkAuth);
}
