/**
 * ApiService - Centralized service for making API requests with JWT authentication
 */
class ApiService {
    constructor(baseUrl = '') {
        this.baseUrl = baseUrl;
    }

    /**
     * Get default headers with content type and authorization if token exists
     * @returns {Object} Headers object
     */
    getDefaultHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };

        const token = TokenUtils.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    }

    /**
     * Handle API response
     * @param {Response} response - Fetch response object
     * @returns {Promise<Object>} Parsed JSON response
     */
    async handleResponse(response) {
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            const error = new Error(data.message || 'Something went wrong');
            error.status = response.status;
            error.data = data;
            throw error;
        }

        return data;
    }

    /**
     * Make a GET request
     * @param {string} endpoint - API endpoint
     * @param {Object} params - Query parameters
     * @returns {Promise<Object>} Response data
     */
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = `${this.baseUrl}${endpoint}${queryString ? `?${queryString}` : ''}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: this.getDefaultHeaders(),
            credentials: 'include',
        });

        return this.handleResponse(response);
    }

    /**
     * Make a POST request
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request body
     * @returns {Promise<Object>} Response data
     */
    async post(endpoint, data = {}) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: this.getDefaultHeaders(),
            body: JSON.stringify(data),
            credentials: 'include',
        });

        return this.handleResponse(response);
    }

    /**
     * Make a PUT request
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request body
     * @returns {Promise<Object>} Response data
     */
    async put(endpoint, data = {}) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'PUT',
            headers: this.getDefaultHeaders(),
            body: JSON.stringify(data),
            credentials: 'include',
        });

        return this.handleResponse(response);
    }

    /**
     * Make a DELETE request
     * @param {string} endpoint - API endpoint
     * @returns {Promise<Object>} Response data
     */
    async delete(endpoint) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'DELETE',
            headers: this.getDefaultHeaders(),
            credentials: 'include',
        });

        return this.handleResponse(response);
    }

    /**
     * Make a PATCH request
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request body
     * @returns {Promise<Object>} Response data
     */
    async patch(endpoint, data = {}) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'PATCH',
            headers: this.getDefaultHeaders(),
            body: JSON.stringify(data),
            credentials: 'include',
        });

        return this.handleResponse(response);
    }

    /**
     * Upload a file using FormData
     * @param {string} endpoint - API endpoint
     * @ {FormData} formData - FormData containing the file
     * @returns {Promise<Object>} Response data
     */
    async uploadFile(endpoint, formData) {
        const headers = { ...this.getDefaultHeaders() };
        delete headers['Content-Type']; // Let the browser set the correct content type

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers,
            body: formData,
            credentials: 'include',
        });

        return this.handleResponse(response);
    }
}

// Create a singleton instance
const apiService = new ApiService('/api');

// Make it available globally
window.ApiService = apiService;
