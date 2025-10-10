/**
 * TokenUtils - Utility class for handling JWT tokens in the browser
 */
class TokenUtils {
    // Token storage key in localStorage
    static TOKEN_KEY = 'swapkart_auth_token';

    /**
     * Store the JWT token in localStorage
     * @param {string} token - The JWT token to store
     */
    static setToken(token) {
        if (token) {
            localStorage.setItem(this.TOKEN_KEY, token);
            return true;
        }
        return false;
    }

    /**
     * Retrieve the JWT token from localStorage
     * @returns {string|null} The stored JWT token or null if not found
     */
    static getToken() {
        return localStorage.getItem(this.TOKEN_KEY);
    }

    /**
     * Remove the JWT token from localStorage
     */
    static removeToken() {
        localStorage.removeItem(this.TOKEN_KEY);
    }

    /**
     * Check if a valid token exists
     * @returns {boolean} True if a valid token exists, false otherwise
     */
    static hasValidToken() {
        const token = this.getToken();
        if (!token) return false;

        try {
            const payload = this.decodeToken(token);
            return payload && payload.exp * 1000 > Date.now();
        } catch (e) {
            return false;
        }
    }

    /**
     * Decode a JWT token without verification
     * @param {string} token - The JWT token to decode
     * @returns {Object|null} The decoded token payload or null if invalid
     */
    static decodeToken(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );
            return JSON.parse(jsonPayload);
        } catch (e) {
            console.error('Error decoding token:', e);
            return null;
        }
    }

    /**
     * Get the current user's roles from the token
     * @returns {Array} Array of user roles or empty array if not available
     */
    static getUserRoles() {
        const token = this.getToken();
        if (!token) return [];

        try {
            const payload = this.decodeToken(token);
            if (payload && payload.roles) {
                return Array.isArray(payload.roles) ? payload.roles : [payload.roles];
            }
            return [];
        } catch (e) {
            return [];
        }
    }

    /**
     * Check if the current user has a specific role
     * @param {string} role - The role to check for
     * @returns {boolean} True if the user has the role, false otherwise
     */
    static hasRole(role) {
        const roles = this.getUserRoles();
        return roles.includes(role);
    }

    /**
     * Get the current user's username/email from the token
     * @returns {string|null} The username/email or null if not available
     */
    static getUsername() {
        const token = this.getToken();
        if (!token) return null;

        try {
            const payload = this.decodeToken(token);
            return payload?.sub || null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Get the token expiration timestamp
     * @returns {number|null} Expiration timestamp in milliseconds or null if not available
     */
    static getTokenExpiration() {
        const token = this.getToken();
        if (!token) return null;

        try {
            const payload = this.decodeToken(token);
            return payload?.exp ? payload.exp * 1000 : null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Check if the token is expired
     * @returns {boolean} True if the token is expired or invalid, false otherwise
     */
    static isTokenExpired() {
        const expiration = this.getTokenExpiration();
        return !expiration || expiration < Date.now();
    }
}

// Make it available globally
window.TokenUtils = TokenUtils;
