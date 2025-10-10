/**
 * Item Actions Handler
 * Handles the item action modals (Buy Now, Swap, Donate) and their interactions
 */

// API Endpoints
const API_ENDPOINTS = {
    TRANSACTIONS: '/api/transactions',
    ITEMS: '/api/items',
    RATINGS: '/api/ratings',
    MY_ITEMS: '/api/items/my-items'
};

// Toast notification function
function showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.position = 'fixed';
        toastContainer.style.top = '20px';
        toastContainer.style.right = '20px';
        toastContainer.style.zIndex = '9999';
        document.body.appendChild(toastContainer);
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast show align-items-center text-white bg-${type === 'error' ? 'danger' : 'success'} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    toast.style.marginBottom = '10px';
    toast.style.transition = 'opacity 0.3s ease-in-out';

    // Add toast content
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'} me-2"></i>
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;

    // Add to container
    toastContainer.appendChild(toast);

    // Auto-remove after delay
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 5000);

    // Add click handler to close button
    const closeButton = toast.querySelector('[data-bs-dismiss="toast"]');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        });
    }
}

class ItemActions {
    constructor() {
        this.currentItem = null;
        this.selectedSwapItem = null;
        this.initializeEventListeners();
        this.initializeModals();
    }

    initializeModals() {
        // Initialize Bootstrap modals with custom styling
        const modals = ['buyNowModal', 'swapModal', 'donateModal', 'ratingModal'];
        modals.forEach(modalId => {
            const modalEl = document.getElementById(modalId);
            if (modalEl) {
                modalEl.addEventListener('show.bs.modal', () => {
                    document.body.classList.add('modal-open');
                });
                modalEl.addEventListener('hidden.bs.modal', () => {
                    document.body.classList.remove('modal-open');
                });
            }
        });
    }

    initializeEventListeners() {
        // Buy Now Modal
        document.getElementById('buyNowBtn')?.addEventListener('click', () => this.openBuyNowModal());
        document.getElementById('confirmPurchase')?.addEventListener('click', () => this.handlePurchase());
        document.getElementById('makeOfferCheck')?.addEventListener('change', (e) => {
            const offerSection = document.getElementById('offerSection');
            if (offerSection) {
                offerSection.style.display = e.target.checked ? 'block' : 'none';
                if (e.target.checked) {
                    document.getElementById('offerAmount')?.focus();
                }
            }
        });
        document.getElementById('deliveryMethod')?.addEventListener('change', () => this.updateTotalAmount());

        // Swap Modal
        document.getElementById('swapBtn')?.addEventListener('click', () => this.openSwapModal());
        document.getElementById('confirmSwap')?.addEventListener('click', () => this.handleSwap());
        document.getElementById('deliveryPreference')?.addEventListener('change', (e) => {
            const pickupAddress = document.getElementById('pickupAddress');
            if (pickupAddress) {
                pickupAddress.style.display = e.target.value === 'PICKUP' ? 'block' : 'none';
            }
        });

        // Donate Modal
        document.getElementById('donateBtn')?.addEventListener('click', () => this.openDonateModal());
        document.getElementById('confirmDonation')?.addEventListener('click', () => this.handleDonation());

        // Rating Modal
        document.querySelectorAll('.rating-stars i').forEach(star => {
            star.addEventListener('click', (e) => this.setRating(e));
        });
        document.getElementById('submitRating')?.addEventListener('click', () => this.submitRating());
    }

    // Buy Now Modal Functions
    openBuyNowModal() {
        if (!this.currentItem) return;

        const modal = new bootstrap.Modal(document.getElementById('buyNowModal'));

        // Set item details
        document.getElementById('buyItemTitle').textContent = this.currentItem.title;
        document.getElementById('buyItemPrice').textContent = `₹${this.currentItem.price?.toLocaleString() || '0'}`;
        document.getElementById('buyItemImage').src = this.currentItem.images?.[0] || 'img/placeholder-item.jpg';
        document.getElementById('buyItemImage').alt = this.currentItem.title;

        // Reset form
        document.getElementById('makeOfferCheck').checked = false;
        document.getElementById('offerSection').style.display = 'none';
        document.getElementById('offerAmount').value = '';
        document.getElementById('offerMessage').value = '';
        document.getElementById('deliveryMethod').value = 'standard';

        this.updateTotalAmount();
        modal.show();
    }

    updateTotalAmount() {
        if (!this.currentItem) return;

        const deliveryMethod = document.getElementById('deliveryMethod')?.value || 'standard';
        let total = parseFloat(this.currentItem.price) || 0;

        if (deliveryMethod === 'express') {
            total += 100; // Add express delivery fee
        } else if (deliveryMethod === 'free') {
            // No additional charge for free delivery
        }

        const totalElement = document.getElementById('totalAmount');
        if (totalElement) {
            totalElement.textContent = `₹${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
    }

    async handlePurchase() {
        const makeOffer = document.getElementById('makeOfferCheck')?.checked || false;
        const offerAmount = parseFloat(document.getElementById('offerAmount')?.value);
        const offerMessage = document.getElementById('offerMessage')?.value || '';
        const deliveryMethod = document.getElementById('deliveryMethod')?.value || 'standard';

        if (makeOffer && (!offerAmount || isNaN(offerAmount) || offerAmount <= 0)) {
            showToast('Please enter a valid offer amount', 'error');
            return;
        }

        try {
            const response = await fetch(API_ENDPOINTS.TRANSACTIONS, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                },
                body: JSON.stringify({
                    itemId: this.currentItem.id,
                    type: makeOffer ? 'OFFER' : 'PURCHASE',
                    amount: makeOffer ? offerAmount : this.currentItem.price,
                    message: makeOffer ? offerMessage : '',
                    deliveryMethod: deliveryMethod,
                    status: 'PENDING'
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to process purchase');
            }

            showToast('Purchase request sent successfully!', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('buyNowModal'));
            if (modal) modal.hide();

            // Refresh the page or update UI as needed
            if (typeof window.refreshItemList === 'function') {
                window.refreshItemList();
            }
        } catch (error) {
            console.error('Purchase error:', error);
            showToast(error.message || 'Failed to process purchase', 'error');
        }
    }

    // Swap Modal Functions
    async openSwapModal() {
        if (!this.currentItem) return;

        const modal = new bootstrap.Modal(document.getElementById('swapModal'));
        const swapItemsList = document.getElementById('swapItemsList');

        if (!swapItemsList) {
            console.error('Swap items list element not found');
            return;
        }

        // Show loading state
        swapItemsList.innerHTML = `
            <div class="col-12 text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Loading your items...</p>
            </div>
        `;

        try {
            const response = await fetch(API_ENDPOINTS.MY_ITEMS, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load your items');
            }

            const items = await response.json();

            if (!items || items.length === 0) {
                swapItemsList.innerHTML = `
                    <div class="col-12 text-center py-4">
                        <i class="fas fa-box-open fa-3x text-muted mb-3"></i>
                        <p class="mb-3">You don't have any items to swap yet.</p>
                        <a href="/sell-item.html" class="btn btn-primary">
                            <i class="fas fa-plus-circle me-2"></i>List an Item
                        </a>
                    </div>
                `;
                return;
            }

            // Render items grid
            swapItemsList.innerHTML = items
                .filter(item => item.id !== this.currentItem.id) // Exclude current item
                .map(item => `
                <div class="col-6 col-md-4 mb-3">
                    <div class="card h-100 swap-item-card ${this.selectedSwapItem?.id === item.id ? 'border-primary shadow' : ''}"
                         data-item-id="${item.id}"
                         style="cursor: pointer; transition: all 0.2s ease;">
                        <img src="${item.images?.[0] || 'img/placeholder-item.jpg'}"
                             class="card-img-top"
                             alt="${item.title}"
                             style="height: 120px; object-fit: cover; background-color: #f8f9fa;">
                        <div class="card-body p-2">
                            <h6 class="card-title mb-1 text-truncate" title="${item.title}">${item.title}</h6>
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="badge bg-light text-dark">${item.condition || 'Good'}</span>
                                <span class="text-muted small">${item.category || ''}</span>
                            </div>
                            <button class="btn btn-sm mt-2 w-100 ${this.selectedSwapItem?.id === item.id ? 'btn-primary' : 'btn-outline-primary'}">
                                ${this.selectedSwapItem?.id === item.id ? 'Selected' : 'Select for Swap'}
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');

            // Add click handlers to swap items
            document.querySelectorAll('.swap-item-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    const itemId = parseInt(card.getAttribute('data-item-id'));
                    this.selectedSwapItem = items.find(item => item.id === itemId);

                    // Update UI
                    document.querySelectorAll('.swap-item-card').forEach(c => {
                        c.classList.remove('border-primary', 'shadow');
                        const btn = c.querySelector('button');
                        if (btn) {
                            btn.classList.remove('btn-primary');
                            btn.classList.add('btn-outline-primary');
                            btn.textContent = 'Select for Swap';
                        }
                    });

                    card.classList.add('border-primary', 'shadow');
                    const btn = card.querySelector('button');
                    if (btn) {
                        btn.classList.remove('btn-outline-primary');
                        btn.classList.add('btn-primary');
                        btn.textContent = 'Selected';
                    }

                    // Enable confirm button
                    const confirmBtn = document.getElementById('confirmSwap');
                    if (confirmBtn) {
                        confirmBtn.disabled = false;
                    }
                });
            });

            modal.show();
        } catch (error) {
            console.error('Error loading swap items:', error);
            swapItemsList.innerHTML = `
                <div class="col-12 text-center py-4 text-danger">
                    <i class="fas fa-exclamation-triangle fa-2x mb-3"></i>
                    <p class="mb-3">Failed to load your items. Please try again.</p>
                    <button class="btn btn-outline-secondary" onclick="window.itemActions.openSwapModal()">
                        <i class="fas fa-sync-alt me-2"></i> Retry
                    </button>
                </div>
            `;
        }
    }

    async handleSwap() {
        if (!this.selectedSwapItem) {
            showToast('Please select an item to swap', 'error');
            return;
        }

        const condition = document.getElementById('swapItemCondition')?.value || 'GOOD';
        const message = document.getElementById('swapMessage')?.value || '';

        try {
            const response = await fetch(API_ENDPOINTS.TRANSACTIONS, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                },
                body: JSON.stringify({
                    type: 'SWAP',
                    itemId: this.currentItem.id,
                    offeredItemId: this.selectedSwapItem.id,
                    offeredItemCondition: condition,
                    message: message,
                    status: 'PENDING'
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to initiate swap');
            }

            showToast('Swap request sent successfully!', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('swapModal'));
            if (modal) modal.hide();

            // Reset selection
            this.selectedSwapItem = null;

            // Refresh the page or update UI as needed
            if (typeof window.refreshItemList === 'function') {
                window.refreshItemList();
            }
        } catch (error) {
            console.error('Swap error:', error);
            showToast(error.message || 'Failed to initiate swap', 'error');
        }
    }

    // Donate Modal Functions
    openDonateModal() {
        if (!this.currentItem) return;

        const modal = new bootstrap.Modal(document.getElementById('donateModal'));

        // Set item details
        document.getElementById('donateItemTitle').textContent = this.currentItem.title;
        const donateImage = document.getElementById('donateItemImage');
        if (donateImage) {
            donateImage.src = this.currentItem.images?.[0] || 'img/placeholder-item.jpg';
            donateImage.alt = this.currentItem.title;
        }

        // Reset form
        document.getElementById('donationReason').value = '';
        document.getElementById('deliveryPreference').value = 'PICKUP';
        const pickupAddress = document.getElementById('pickupAddress');
        if (pickupAddress) pickupAddress.style.display = 'block';

        modal.show();
    }

    async handleDonation() {
        const reason = document.getElementById('donationReason')?.value.trim() || '';
        const deliveryPreference = document.getElementById('deliveryPreference')?.value || 'PICKUP';
        const pickupAddress = deliveryPreference === 'PICKUP'
            ? document.getElementById('pickupAddressInput')?.value.trim() || ''
            : '';

        if (!reason) {
            showToast('Please tell us why you need this item', 'error');
            return;
        }

        if (deliveryPreference === 'PICKUP' && !pickupAddress) {
            showToast('Please provide a pickup address', 'error');
            return;
        }

        try {
            const response = await fetch(API_ENDPOINTS.TRANSACTIONS, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                },
                body: JSON.stringify({
                    type: 'DONATION',
                    itemId: this.currentItem.id,
                    reason: reason,
                    deliveryPreference: deliveryPreference,
                    pickupAddress: deliveryPreference === 'PICKUP' ? pickupAddress : null,
                    status: 'PENDING'
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to request donation');
            }

            showToast('Donation request sent successfully!', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('donateModal'));
            if (modal) modal.hide();

            // Refresh the page or update UI as needed
            if (typeof window.refreshItemList === 'function') {
                window.refreshItemList();
            }
        } catch (error) {
            console.error('Donation error:', error);
            showToast(error.message || 'Failed to request donation', 'error');
        }
    }

    // Rating Functions
    setRating(event) {
        const star = event.target.closest('.star');
        if (!star) return;

        const rating = parseInt(star.getAttribute('data-rating'));
        const stars = document.querySelectorAll('.rating-stars .star');

        stars.forEach((s, index) => {
            if (index < rating) {
                s.classList.remove('far');
                s.classList.add('fas', 'text-warning');
            } else {
                s.classList.remove('fas', 'text-warning');
                s.classList.add('far');
            }
        });

        const ratingValue = document.getElementById('ratingValue');
        if (ratingValue) ratingValue.value = rating;

        const ratingText = document.getElementById('ratingText');
        if (ratingText) {
            const texts = ['Very Poor', 'Poor', 'Average', 'Good', 'Excellent'];
            ratingText.textContent = texts[rating - 1] || 'Rate this item';
        }
    }

    async submitRating() {
        const rating = document.getElementById('ratingValue')?.value;
        const comment = document.getElementById('ratingComment')?.value.trim() || '';
        const transactionId = document.getElementById('ratingTransactionId')?.value;

        if (!rating) {
            showToast('Please select a rating', 'error');
            return;
        }

        try {
            const response = await fetch(API_ENDPOINTS.RATINGS, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                },
                body: JSON.stringify({
                    transactionId: transactionId,
                    rating: parseInt(rating),
                    comment: comment,
                    itemId: this.currentItem?.id
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to submit rating');
            }

            showToast('Thank you for your feedback!', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('ratingModal'));
            if (modal) modal.hide();

            // Refresh ratings display
            if (typeof window.loadItemRatings === 'function') {
                window.loadItemRatings(this.currentItem.id);
            }
        } catch (error) {
            console.error('Rating error:', error);
            showToast(error.message || 'Failed to submit rating', 'error');
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.itemActions = new ItemActions();
});

// Global functions for item actions
function initiatePurchase(item) {
    if (window.itemActions) {
        window.itemActions.currentItem = item;
        window.itemActions.openBuyNowModal();
    }
}

function initiateSwap(item) {
    if (window.itemActions) {
        window.itemActions.currentItem = item;
        window.itemActions.openSwapModal();
    }
}

function initiateDonation(item) {
    if (window.itemActions) {
        window.itemActions.currentItem = item;
        window.itemActions.openDonateModal();
    }
}

// Add CSS for toast notifications
const toastStyles = document.createElement('style');
toastStyles.textContent = `
.toast {
    opacity: 0;
    transition: opacity 0.3s ease-in-out;
    margin-bottom: 10px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    max-width: 350px;
}

.toast.show {
    opacity: 1;
}

.toast-header {
    border-bottom: none;
    padding: 0.75rem 1rem;
    border-radius: 8px 8px 0 0;
}

.toast-body {
    padding: 1rem;
    display: flex;
    align-items: center;
}

.toast i {
    margin-right: 8px;
}

.btn-close {
    padding: 0.5rem;
    margin: -0.5rem -0.5rem -0.5rem auto;
}
`;
document.head.appendChild(toastStyles);
