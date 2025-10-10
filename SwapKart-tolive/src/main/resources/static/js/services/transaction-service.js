// API service functions for transactions
const TransactionService = {
    // Create a new transaction
    createTransaction: async (transactionData) => {
        try {
             // Validate required fields
             if (!transactionData.type) {
                 throw new Error('Transaction type is required');
             }

            const token = localStorage.getItem('token');
            const response = await fetch('/api/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(transactionData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to create transaction');
            }

            return await response.json();
        } catch (error) {
            console.error('Transaction error:', error);
            throw error;
        }
    },

    // Get user's sent transactions
    getSentTransactions: async () => {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/transactions/sent', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await response.json();
    },

    // Get user's received transactions
    getReceivedTransactions: async () => {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/transactions/received', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await response.json();
    },

    // Update transaction status
    updateTransactionStatus: async (transactionId, status) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/transactions/${transactionId}/status?status=${status}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await response.json();
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TransactionService;
}