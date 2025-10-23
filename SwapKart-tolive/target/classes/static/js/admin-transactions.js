// Admin Transactions Management
class TransactionManager {
    constructor() {
        this.baseUrl = '/api/transactions/admin';
        this.currentPage = 0;
        this.pageSize = 10;
        this.totalPages = 0;
        this.totalTransactions = 0;
        this.searchQuery = '';
        this.statusFilter = '';
        this.sortField = 'createdAt';
        this.sortDirection = 'desc';
        this.transactions = [];

        this.initialize();
    }

    async initialize() {
        if (!this.isAuthenticated()) {
            this.redirectToLogin();
            return;
        }

        this.initializeEventListeners();
        await this.loadTransactions();
    }

    isAuthenticated() {
        const token = localStorage.getItem('token');
        return !!token;
    }

    redirectToLogin() {
        window.location.href = '/admin-login.html';
    }

    getAuthHeaders() {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        };
    }

    initializeEventListeners() {
        document.getElementById('searchTransactions').addEventListener('input', (e) => {
            this.searchQuery = e.target.value.trim();
            this.currentPage = 0;
            this.debouncedSearch();
        });

        document.getElementById('statusFilter').addEventListener('change', (e) => {
            this.statusFilter = e.target.value;
            this.currentPage = 0;
            this.loadTransactions();
        });

        this.toast = new bootstrap.Toast(document.getElementById('toast'));
    }

    debouncedSearch = this.debounce(() => {
        this.loadTransactions();
    }, 300);

    debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    async loadTransactions() {
        try {
            this.showLoading(true);

            const params = new URLSearchParams({
                page: this.currentPage,
                size: this.pageSize,
                sort: `${this.sortField},${this.sortDirection}`
            });

            if (this.searchQuery) params.append('search', this.searchQuery);

            let endpoint = this.baseUrl;
            if (this.statusFilter) {
                endpoint += `/admin/status/${this.statusFilter}`;
            }

            const response = await fetch(`${endpoint}?${params.toString()}`, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) throw new Error('Failed to fetch transactions');

            const data = await response.json();

            this.transactions = data.content || [];
            this.totalPages = data.totalPages || 1;
            this.totalTransactions = data.totalElements || 0;

            this.renderTransactions();
            this.renderPagination();
        } catch (error) {
            console.error('Error loading transactions:', error);
            this.showError('Failed to load transactions. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    renderTransactions() {
        const tbody = document.getElementById('transactionsTableBody');

        if (this.transactions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center py-4">
                        <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                        <p class="mb-0">No transactions found</p>
                    </td>
                </tr>
            `;
            return;
        }

        console.log(`Transaction Details: ${JSON.stringify(this.transactions[0], null, 2)}`);  // Formatted JSON

        tbody.innerHTML = this.transactions.map(t => `
            <tr>
                <td>#${t.id}</td>
                <td>${t.buyerName || 'N/A'}</td>
                <td>${t.sellerName || 'N/A'}</td>
                <td>${t.itemName || 'N/A'}</td>
                <td>${this.formatType(t.type)}</td>
                <td>${(t.type === 'BUY' && t.amount != null) ? `₹${t.amount}` : (t.type === 'SWAP') ? 'FOR SWAP' : 'FREE'}</td>
                <td>${this.formatDate(t.createdAt)}</td>
                <td><span class="status ${t.status.toLowerCase()}">${this.formatStatus(t.status)}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary view-details" data-id="${t.id}"><i class="fas fa-eye"></i></button>
                </td>
            </tr>
        `).join('');

        this.initializeRowEventListeners();
    }

    formatType(type) {
        const types = { 'BUY': 'Buy', 'SWAP': 'Swap', 'REQUEST': 'Request' };
        return types[type] || type;
    }

    formatStatus(status) {
        const statusMap = {
            'PENDING': 'Pending',
            'ACCEPTED': 'Accepted',
            'COMPLETED': 'Completed',
            'CANCELLED': 'Cancelled',
            'REFUNDED': 'Refunded',
            'FAILED': 'Failed'
        };
        return statusMap[status] || status;
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    initializeRowEventListeners() {
        document.querySelectorAll('.view-details').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                this.showTransactionDetails(id);
            });
        });

        document.querySelectorAll('.update-status').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                this.showUpdateStatusModal(id);
            });
        });
    }

    async showTransactionDetails(id) {
        const txn = this.transactions.find(t => t.id == id);
        if (!txn) return;

        const modalBody = document.getElementById('transactionDetailsBody');
        modalBody.innerHTML = `
            <p><strong>ID:</strong> #${txn.id}</p>
            <p><strong>Type:</strong> ${this.formatType(txn.type)}</p>
            <p><strong>Status:</strong> ${this.formatStatus(txn.status)}</p>
            <p><strong>Buyer:</strong> ${txn.buyerName || 'N/A'}</p>
            <p><strong>Seller:</strong> ${txn.sellerName || 'N/A'}</p>
            <p><strong>Item:</strong> ${txn.itemName || 'N/A'}</p>
            <p><strong>Message:</strong> ${txn.message || 'N/A'}</p>
            <p><strong>Date:</strong> ${this.formatDate(txn.createdAt)}</p>
        `;

        const modal = new bootstrap.Modal(document.getElementById('transactionDetailsModal'));
        modal.show();

        this.currentTransactionId = id;
    }

    async showUpdateStatusModal(id = null) {
        const txnId = id || this.currentTransactionId;
        const txn = this.transactions.find(t => t.id == txnId);
        if (!txn) return;

        const { value: status } = await Swal.fire({
            title: 'Update Transaction Status',
            input: 'select',
            inputOptions: {
                'PENDING': 'Pending',
                'ACCEPTED': 'Accepted',
                'COMPLETED': 'Completed',
                'CANCELLED': 'Cancelled',
                'REFUNDED': 'Refunded'
            },
            inputValue: txn.status,
            showCancelButton: true
        });

        if (status) await this.updateTransactionStatus(txnId, status);
    }

    async updateTransactionStatus(id, status) {
        try {
            const res = await fetch(`${this.baseUrl}/${id}/status?status=${status}`, {
                method: 'PUT',
                headers: this.getAuthHeaders()
            });
            if (!res.ok) throw new Error('Failed to update status');
            this.showSuccess('Transaction status updated');
            this.loadTransactions();
        } catch (err) {
            console.error(err);
            this.showError(err.message);
        }
    }

    renderPagination() {
        const pagination = document.getElementById('pagination');
        if (!pagination) return;

        pagination.innerHTML = '';

        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${this.currentPage === 0 ? 'disabled' : ''}`;
        prevLi.innerHTML = `<a class="page-link" href="#">&laquo;</a>`;
        prevLi.addEventListener('click', e => {
            e.preventDefault();
            if (this.currentPage > 0) { this.currentPage--; this.loadTransactions(); }
        });
        pagination.appendChild(prevLi);

        for (let i = 0; i < this.totalPages; i++) {
            const li = document.createElement('li');
            li.className = `page-item ${i === this.currentPage ? 'active' : ''}`;
            li.innerHTML = `<a class="page-link" href="#">${i + 1}</a>`;
            li.addEventListener('click', e => { e.preventDefault(); this.currentPage = i; this.loadTransactions(); });
            pagination.appendChild(li);
        }

        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${this.currentPage >= this.totalPages - 1 ? 'disabled' : ''}`;
        nextLi.innerHTML = `<a class="page-link" href="#">&raquo;</a>`;
        nextLi.addEventListener('click', e => {
            e.preventDefault();
            if (this.currentPage < this.totalPages - 1) { this.currentPage++; this.loadTransactions(); }
        });
        pagination.appendChild(nextLi);
    }

    showLoading(show) {
        const loader = document.getElementById('loadingIndicator');
        if (!loader) return;
        loader.style.display = show ? 'block' : 'none';
    }

    showSuccess(msg) { this.showToast(msg, 'success'); }
    showError(msg) { this.showToast(msg, 'danger'); }

    showToast(msg, type = 'info') {
        const toast = document.getElementById('toast');
        const toastTitle = document.getElementById('toast-title');
        const toastMessage = document.getElementById('toast-message');
        if (!toast || !toastTitle || !toastMessage) return;

        toastTitle.textContent = type.charAt(0).toUpperCase() + type.slice(1);
        toastMessage.textContent = msg;
        toast.className = `toast bg-${type} text-white`;
        new bootstrap.Toast(toast).show();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => { window.transactionManager = new TransactionManager(); });

// Logout
function handleLogout() {
    localStorage.removeItem('token');
    window.location.href = '/login';
}
