// Auth utility functions
const Auth = {
    // Store token in localStorage
    setToken: (token) => {
        if (token) {
            localStorage.setItem('token', token);
            return true;
        }
        return false;
    },

    // Get token from localStorage
    getToken: () => {
        return localStorage.getItem('token');
    },

    // Remove token from localStorage
    removeToken: () => {
        localStorage.removeItem('token');
    },

    // Check if user is authenticated
    isAuthenticated: () => {
        const token = Auth.getToken();
        if (!token) return false;

        // Check if token is expired
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.exp * 1000 > Date.now();
        } catch (e) {
            return false;
        }
    },

    // Get user info from token
    getUserInfo: () => {
        const token = Auth.getToken();
        if (!token) return null;

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return {
                email: payload.sub,
                roles: payload.roles || []
            };
        } catch (e) {
            return null;
        }
    },

    // Handle login form submission
    handleLogin: async (event) => {
        event.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Login failed');
            }

            const data = await response.json();
            Auth.setToken(data.token);

            // Redirect to dashboard or previous URL
            const redirectUrl = new URLSearchParams(window.location.search).get('redirect') || '/';
            window.location.href = redirectUrl;

        } catch (error) {
            console.error('Login error:', error);
            // Show error message to user
            alert(error.message || 'Login failed. Please try again.');
        }
    },

    // Handle logout
    handleLogout: async () => {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${Auth.getToken()}`
                }
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            Auth.removeToken();
            window.location.href = '/login';
        }
    },

    // Add authorization header to fetch requests
    authFetch: async (url, options = {}) => {
        const token = Auth.getToken();

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return fetch(url, {
            ...options,
            headers
        });
    }
};

// Add event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Login form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', Auth.handleLogin);
    }

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', Auth.handleLogout);
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Auth;
}
