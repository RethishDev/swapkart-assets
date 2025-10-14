/**
 * Rating Service
 * Handles all rating-related API calls
 */
class RatingService {
    constructor() {
        this.baseUrl = '/api/ratings';
    }

    /**
     * Check if a transaction is eligible for rating
     * @param {number} transactionId - The ID of the transaction
     * @returns {Promise<boolean>} - Whether the transaction can be rated
     */
    async isTransactionEligibleForRating(transactionId) {
        try {
            const response = await fetch(`${this.baseUrl}/transaction/${transactionId}/eligible`, {
                headers: this._getAuthHeaders()
            });
            
            if (!response.ok) {
                throw new Error('Failed to check rating eligibility');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error checking rating eligibility:', error);
            throw error;
        }
    }

    /**
     * Submit a rating for a transaction
     * @param {number} transactionId - The ID of the transaction
     * @param {object} ratingData - The rating data (score and comment)
     * @returns {Promise<object>} - The created/updated rating
     */
    async rateTransaction(transactionId, ratingData) {
        try {
            const response = await fetch(`${this.baseUrl}/transaction/${transactionId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this._getAuthHeaders()
                },
                body: JSON.stringify(ratingData)
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to submit rating');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error submitting rating:', error);
            throw error;
        }
    }

    /**
     * Get a rating for a specific transaction
     * @param {number} transactionId - The ID of the transaction
     * @returns {Promise<object|null>} - The rating or null if not found
     */
    async getRatingForTransaction(transactionId) {
        try {
            const response = await fetch(`${this.baseUrl}/transaction/${transactionId}`, {
                headers: this._getAuthHeaders()
            });
            
            if (response.status === 404) {
                return null; // No rating exists for this transaction
            }
            
            if (!response.ok) {
                throw new Error('Failed to fetch rating');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching rating:', error);
            throw error;
        }
    }

    /**
     * Get authentication headers with JWT token
     * @private
     */
    _getAuthHeaders() {
        const token = localStorage.getItem('token');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }
}

// Create and export a singleton instance
const ratingService = new RatingService();
export default ratingService;
