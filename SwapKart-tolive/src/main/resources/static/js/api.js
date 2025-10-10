// API utility functions
class ApiClient {
    static async request(endpoint, options = {}) {
        // Get token from localStorage
        const token = localStorage.getItem('token');
        
        // Set default headers
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...options.headers
        };

        // Add Authorization header if token exists
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Merge options with defaults
        const config = {
            credentials: 'include',
            ...options,
            headers
        };

        try {
            const response = await fetch(endpoint, config);
            
            // Handle 401 Unauthorized
            if (response.status === 401) {
                // Clear stored token and redirect to login
                localStorage.removeItem('token');
                localStorage.removeItem('role');
                localStorage.removeItem('username');
                window.location.href = '/login.html?sessionExpired=true';
                throw new Error('Session expired. Please log in again.');
            }

            // Parse response as JSON if possible, otherwise as text
            let data;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            if (!response.ok) {
                throw new Error(data.message || 'Something went wrong');
            }

            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Helper methods for common HTTP methods
    static get(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'GET' });
    }

    static post(endpoint, data = {}, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    static put(endpoint, data = {}, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    static delete(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'DELETE' });
    }
}
