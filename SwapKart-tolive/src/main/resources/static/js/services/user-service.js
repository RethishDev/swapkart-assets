/**
 * UserService - Service for handling user-related API calls
 */
class UserService {
    constructor(apiService) {
        this.apiService = apiService;
    }

    /**
     * Login a user
     * @param {string} email - User's email
     * @param {string} password - User's password
     * @returns {Promise<Object>} User data with token
     */
    async login(email, password) {
        try {
            const response = await this.apiService.post('/auth/login', { email, password });
            if (response.token) {
                TokenUtils.setToken(response.token);
            }
            return response;
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    }

    /**
     * Logout the current user
     * @returns {Promise<Object>} Logout response
     */
    async logout() {
        try {
            const response = await this.apiService.post('/auth/logout');
            TokenUtils.removeToken();
            return response;
        } catch (error) {
            console.error('Logout failed:', error);
            TokenUtils.removeToken(); // Ensure token is removed even if the request fails
            throw error;
        }
    }

    /**
     * Get current user's profile
     * @returns {Promise<Object>} User profile data
     */
    async getCurrentUser() {
        return this.apiService.get('/users/me');
    }

    /**
     * Update current user's profile
     * @param {Object} userData - User data to update
     * @returns {Promise<Object>} Updated user data
     */
    async updateProfile(userData) {
        return this.apiService.put('/users/me', userData);
    }

    /**
     * Change user's password
     * @param {string} currentPassword - Current password
     * @param {string} newPassword - New password
     * @returns {Promise<Object>} Response message
     */
    async changePassword(currentPassword, newPassword) {
        return this.apiService.post('/users/change-password', {
            currentPassword,
            newPassword
        });
    }

    /**
     * Register a new user
     * @param {Object} userData - User registration data
     * @returns {Promise<Object>} Registration response
     */
    async register(userData) {
        return this.apiService.post('/auth/register', userData);
    }

    /**
     * Request password reset
     * @param {string} email - User's email
     * @returns {Promise<Object>} Response message
     */
    async requestPasswordReset(email) {
        return this.apiService.post('/auth/forgot-password', { email });
    }

    /**
     * Reset password with token
     * @param {string} token - Password reset token
     * @param {string} newPassword - New password
     * @returns {Promise<Object>} Response message
     */
    async resetPassword(token, newPassword) {
        return this.apiService.post('/auth/reset-password', {
            token,
            newPassword
        });
    }
}

// Create a singleton instance
const userService = new UserService(ApiService);

// Make it available globally
window.UserService = userService;
