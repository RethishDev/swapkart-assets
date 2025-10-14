// Transaction Management System
window.TransactionManager = class TransactionManager {
    constructor() {
        this.baseUrl = '/api/transactions';
        this.notificationUrl = '/api/notifications';
        this.stompClient = null;
        this.currentUser = this.getCurrentUser();
        this.currentTab = 'received'; // Track current active tab
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectTimeout = null;
        
        this.initialize();
    }

    async initialize() {
        console.log('Initializing TransactionManager with user:', this.currentUser);
        
        if (!this.currentUser || !this.currentUser.id) {
            console.warn('No valid user found, WebSocket not initialized');
            this.showError('Please log in to view transactions');
            return;
        }

        // Verify WebSocket libraries are loaded
        if (!window.webSocketLibrariesLoaded) {
            console.warn('WebSocket libraries not loaded, retrying...');
            setTimeout(() => this.initialize(), 1000);
            return;
        }

        // Initialize WebSocket
        await this.initializeWebSocket();
        
        // Load initial data
        try {
            await this.loadInitialData();
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showError('Failed to load initial data. Please refresh the page.');
        }
    }

    // Load initial data when the page loads
    async loadInitialData() {
        try {
            console.log('Loading initial data...');
            
            // Load transactions for the current tab
            await this.loadTransactions();
            
            // Load unread notifications
            await this.loadNotifications();
            
            console.log('Initial data loaded successfully');
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showError('Failed to load initial data. Please refresh the page.');
        }
    }
    
    // Initialize WebSocket connection for real-time updates
    async initializeWebSocket() {
        if (this.stompClient && this.stompClient.connected) {
            console.log('WebSocket already connected');
            return true;
        }

        // Clear any existing connection
        if (this.stompClient) {
            try {
                this.stompClient.disconnect();
            } catch (e) {
                console.warn('Error disconnecting existing WebSocket:', e);
            }
        }

        try {
            const socket = new SockJS('/ws');
            this.stompClient = Stomp.over(socket);
            
            // Configure debug logging - use console.debug in development, no-op in production
            this.stompClient.debug = (message) => {
                // Only log if not in production (you can remove this check if you want debug logs in production)
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    console.debug('WebSocket:', message);
                }
            };
            
            // Set heartbeat (in ms) - helps detect connection issues
            this.stompClient.heartbeatIncoming = 10000; // 10 seconds
            this.stompClient.heartbeatOutgoing = 10000; // 10 seconds
            
            // Set connection timeout (in ms) - increased to 10 seconds
            const connectTimeout = 10000;
            
            // Create a promise that will reject after timeout
            return new Promise((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    const error = new Error('WebSocket connection timeout');
                    console.error(error);
                    this.handleWebSocketError(error);
                    reject(error);
                }, connectTimeout);
                
                const connectCallback = (frame) => {
                    clearTimeout(timeoutId);
                    console.log('Successfully connected to WebSocket');
                    this.reconnectAttempts = 0;
                    this.subscribeToNotifications();
                    resolve(true);
                };
                
                const errorCallback = (error) => {
                    clearTimeout(timeoutId);
                    console.error('WebSocket connection error:', error);
                    this.handleWebSocketError(error);
                    reject(error);
                };
                
                this.stompClient.connect(
                    this.getAuthHeaders(), // Include auth headers
                    connectCallback,
                    errorCallback
                );
            });
            
        } catch (error) {
            console.error('Error initializing WebSocket:', error);
            this.handleWebSocketError(error);
            throw error;
        }
    }

    // Handle WebSocket errors and implement reconnection logic
    handleWebSocketError(error) {
        console.error('WebSocket error:', error);
        
        // Don't show error for normal disconnections
        if (error && error.toString().indexOf('close') !== -1) {
            console.log('WebSocket closed normally');
            return;
        }
        
        // Only attempt to reconnect if we haven't exceeded max attempts
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            // Calculate delay with exponential backoff (max 30 seconds)
            const baseDelay = 1000; // Start with 1 second
            const maxDelay = 30000; // Max 30 seconds
            const jitter = Math.random() * 1000; // Add up to 1 second of jitter
            const delay = Math.min(baseDelay * Math.pow(2, this.reconnectAttempts), maxDelay) + jitter;
            
            this.reconnectAttempts++;
            
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${Math.round(delay)}ms`);
            
            // Clear any existing timeout to prevent multiple reconnection attempts
            if (this.reconnectTimeout) {
                clearTimeout(this.reconnectTimeout);
            }
            
            this.reconnectTimeout = setTimeout(async () => {
                try {
                    console.log('Attempting to reconnect...');
                    await this.initializeWebSocket();
                    // If we get here, reconnection was successful
                    this.showSuccess('Reconnected successfully!');
                } catch (err) {
                    console.error('Reconnection attempt failed:', err);
                    // The error will be handled by the next call to handleWebSocketError
                }
            }, delay);
            
            // Show a warning to the user after the first failed attempt
            if (this.reconnectAttempts === 1) {
                this.showToast('Connection lost. Attempting to reconnect...', 'warning', 5000);
            }
        } else {
            const errorMsg = 'Max reconnection attempts reached. Please refresh the page to try again.';
            console.error(errorMsg);
            this.showError(errorMsg);
            
            // Add a refresh button to the error message
            const refreshButton = document.createElement('button');
            refreshButton.className = 'btn btn-sm btn-light ms-2';
            refreshButton.innerHTML = '<i class="fas fa-sync-alt me-1"></i> Refresh';
            refreshButton.onclick = () => window.location.reload();
            
            // Find the last toast and append the refresh button
            const toasts = document.querySelectorAll('.toast');
            if (toasts.length > 0) {
                const lastToast = toasts[toasts.length - 1];
                const toastBody = lastToast.querySelector('.toast-body');
                if (toastBody) {
                    toastBody.appendChild(document.createElement('br'));
                    toastBody.appendChild(refreshButton);
                }
            }
        }
    }
    
    // Clean up WebSocket resources
    disconnectWebSocket() {
        if (this.stompClient) {
            try {
                this.stompClient.disconnect();
            } catch (error) {
                console.error('Error disconnecting WebSocket:', error);
            } finally {
                this.stompClient = null;
            }
        }
        
        // Clear any pending reconnection attempts
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        
        this.reconnectAttempts = 0;
    }

    // Subscribe to user-specific notification channel
    subscribeToNotifications() {
        if (!this.currentUser || !this.stompClient) return;
        
        this.stompClient.subscribe(`/user/${this.currentUser.id}/queue/notifications`, (message) => {
            const notification = JSON.parse(message.body);
            this.handleNewNotification(notification);
        });
    }

    // Get current user from localStorage or global window object
    getCurrentUser() {
        try {
            console.log('Getting current user from localStorage...');
            
            // Check if we have a user in the global scope first
            if (window.currentUser && window.currentUser.userId) {
                console.log('Found user in window.currentUser:', window.currentUser);
                return window.currentUser;
            }
            
            // Get user data from localStorage
            const userId = localStorage.getItem('userId');
            const username = localStorage.getItem('username');
            const role = localStorage.getItem('role');
            
            if (!userId) {
                console.warn('No user ID found in localStorage');
                return null;
            }
            
            // Create user object from localStorage data
            const user = {
                id: userId,
                name: username || 'User',
                email: '', // Not available in localStorage
                role: role || 'USER'
            };
            
            console.log('Created user object from localStorage:', user);
            
            // Store in window for future use
            window.currentUser = user;
            return user;
            
        } catch (error) {
            console.error('Error in getCurrentUser:', error);
            return null;
        }
    }

    getAuthHeaders() {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error("No authentication token found");
            return {};
        }
        return {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        };
    }

    // Load all transactions with filters and retry logic
    async loadTransactions(statusFilter = 'all', retryCount = 0) {
        const maxRetries = 3;
        const retryDelay = 1000; // 1 second

        try {
            console.log(`Loading ${this.currentTab} transactions with filter: ${statusFilter}`);

            // Show loading state
            this.showLoading(true);

            // Determine which endpoint to use based on current tab
            const endpoint = this.currentTab === 'received'
                ? `${this.baseUrl}/received`
                : `${this.baseUrl}/sent`;

            // Add status filter if not 'all'
            const url = new URL(endpoint, window.location.origin);
            if (statusFilter !== 'all') {
                url.searchParams.append('status', statusFilter.toUpperCase());
            }
            // Add cache-busting parameter
            url.searchParams.append('_', Date.now());

            // Load the transactions for the current tab
            const response = await fetch(url, {
                method: 'GET',
                headers: this.getAuthHeaders(),
                credentials: 'include',
                cache: 'no-store'
            });

            console.log(`Transactions API response status: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                // Handle 401 Unauthorized
                if (response.status === 401) {
                    this.handleUnauthorized();
                    return [];
                }

                let errorMessage = 'Failed to load transactions';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                    console.error('Error details:', errorData);
                } catch (e) {
                    console.error('Failed to parse error response:', e);
                }

                // Retry on network errors or server errors
                if ((!response.ok || response.status >= 500) && retryCount < maxRetries) {
                    const delay = retryDelay * Math.pow(2, retryCount);
                    console.log(`Retrying (${retryCount + 1}/${maxRetries}) in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return this.loadTransactions(statusFilter, retryCount + 1);
                }

                throw new Error(errorMessage);
            }

            const transactions = await response.json();
            console.log(`Successfully loaded ${transactions.length} transactions`);

            // Render the transactions
            this.renderTransactions(transactions);

            // Load counts in the background, don't wait for it
            this.loadAndUpdateCounts().catch(error => {
                console.error('Error updating transaction counts:', error);
                // Don't fail the whole operation if counts fail
            });

            return transactions;
        } catch (error) {
            console.error('Error loading transactions:', error);
            this.showError(error.message || 'Failed to load transactions. Please try again.');
            throw error; // Re-throw to be caught by the caller
        } finally {
            this.showLoading(false);
        }
    }

    // Show or hide loading state
    showLoading(show) {
        const loadingElement = document.getElementById('loadingIndicator');
        if (loadingElement) {
            loadingElement.style.display = show ? 'block' : 'none';
        }
        
        // Disable filter buttons while loading
        const filterButtons = document.querySelectorAll('.transaction-filter-btn');
        filterButtons.forEach(btn => {
            btn.disabled = show;
        });
    }
    
    // Handle unauthorized access
    handleUnauthorized() {
        console.warn('User is not authenticated. Redirecting to login...');
        // Clear any existing auth tokens
        localStorage.removeItem('token');
        // Redirect to login page
        window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
    }

    // Load unread notifications with improved error handling
    async loadNotifications() {
        try {
            console.log('Loading unread notifications...');

            const response = await fetch(`${this.notificationUrl}/unread`, {
                method: 'GET',
                headers: this.getAuthHeaders(),
                credentials: 'include' // Important for cookies/sessions
            });

            console.log(`Notifications API response status: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                let errorMessage = 'Failed to load notifications';
                try {
                    const errorData = await response.text();
                    console.error('Error response:', errorData);
                    // Try to parse as JSON if possible
                    try {
                        const jsonError = JSON.parse(errorData);
                        errorMessage = jsonError.message || errorMessage;
                    } catch (e) {
                        errorMessage = errorData || errorMessage;
                    }
                } catch (e) {
                    console.error('Failed to parse error response:', e);
                }
                throw new Error(errorMessage);
            }

            const notifications = await response.json();
            console.log(`Successfully loaded ${notifications.length} unread notifications`);

            this.updateNotificationBadge(notifications.length);
            this.renderNotificationDropdown(notifications);

            return notifications;
        } catch (error) {
            console.error('Error loading notifications:', error);
            // Don't show error to user for notifications as it's not critical
            // Just log it for debugging
            return [];
        }
    }

    // Handle new notification from WebSocket
    handleNewNotification(notification) {
        this.loadNotifications();
        this.showNotificationToast(notification);
    }

    // Update notification badge count
    updateNotificationBadge(count) {
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'block' : 'none';
        }
    }

    // Render transactions in the UI
//    renderTransactions(transactions) {
//        const receivedContainer = document.getElementById('receivedTransactions');
//        const sentContainer = document.getElementById('sentTransactions');
//
//        if (!receivedContainer || !sentContainer) return;
//
//        // Determine which container to update based on current tab
//        const targetContainer = this.currentTab === 'received' ? receivedContainer : sentContainer;
//
//        // Clear the target container
//        targetContainer.innerHTML = '';
//
//        if (transactions.length === 0) {
//            targetContainer.innerHTML = this.getEmptyState(
//                this.currentTab === 'received'
//                    ? 'No received transactions found'
//                    : 'No sent transactions found'
//            );
//            return;
//        }
//
//        transactions.forEach(transaction => {
//            const element = this.createTransactionCard(transaction);
//            targetContainer.appendChild(element);
//        });
//    }

    renderTransactions(transactions) {
        const receivedContainer = document.getElementById('receivedTransactions');
        const sentContainer = document.getElementById('sentTransactions');

        if (!receivedContainer || !sentContainer) {
            console.error('Transaction containers not found');
            return;
        }

        // Show/hide containers based on current tab
        if (this.currentTab === 'received') {
            receivedContainer.classList.remove('d-none');
            sentContainer.classList.add('d-none');
        } else {
            receivedContainer.classList.add('d-none');
            sentContainer.classList.remove('d-none');
        }

        const targetContainer = this.currentTab === 'received' ? receivedContainer : sentContainer;

        // Clear the target container
        targetContainer.innerHTML = '';

        if (transactions.length === 0) {
            targetContainer.innerHTML = this.getEmptyState(
                this.currentTab === 'received'
                    ? 'No received transactions found'
                    : 'No sent transactions found'
            );
            return;
        }

        transactions.forEach(transaction => {
            const element = this.createTransactionCard(transaction);
            targetContainer.appendChild(element);
        });
    }

    // Create transaction card element
    createTransactionCard(transaction) {
        const card = document.createElement('div');
        card.className = `transaction-card ${transaction.status} mb-3`;
        card.innerHTML = `
            <div class="d-flex p-3">
                <div class="flex-shrink-0 me-3 position-relative">
                    <img src="${transaction.itemImage || '/images/default-item.svg'}"
                         class="transaction-item-img"
                         alt="${transaction.itemName}">
                    ${transaction.unread ? '<span class="badge bg-danger notification-badge">New</span>' : ''}
                </div>
                <div class="flex-grow-1">
                    <div class="d-flex justify-content-between">
                        <h6 class="mb-1">${transaction.itemName}</h6>
                        <small class="text-muted">${this.formatDate(transaction.createdAt)}</small>
                    </div>
                    <p class="mb-1">${this.getTransactionDescription(transaction)}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="badge bg-${this.getStatusBadgeClass(transaction.status)}">
                            ${this.formatStatus(transaction.status)}
                        </span>
                        <button class="btn btn-sm btn-outline-primary view-details"
                                data-id="${transaction.id}">
                            View Details
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add click handler for view details
        card.querySelector('.view-details').addEventListener('click', () => {
            this.showTransactionDetails(transaction.id);
        });

        return card;
    }

    // Show transaction details in modal
    async showTransactionDetails(transactionId) {
        try {
            // Show loading state
            const modal = document.getElementById('transactionDetailModal');
            const body = modal.querySelector('.modal-body');
            body.innerHTML = `
                <div class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2">Loading transaction details...</p>
                </div>
            `;

            // Store the modal instance
            this.currentModal = new bootstrap.Modal(modal, {
                backdrop: true,
                keyboard: true,
                focus: true
            });

            // Add event listener for hidden event to clean up
            modal.addEventListener('hidden.bs.modal', () => {
                // Remove the modal backdrop if it exists
                const backdrops = document.querySelectorAll('.modal-backdrop');
                backdrops.forEach(backdrop => backdrop.remove());
                
                // Remove modal-open class from body
                document.body.classList.remove('modal-open');
                
                // Reset any inline styles that might be causing scroll lock
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
                
                // Reset the modal state
                modal.style.display = 'none';
                modal.setAttribute('aria-hidden', 'true');
            });

            // Show the modal
            this.currentModal.show();

            // Fetch transaction details
            const response = await fetch(`${this.baseUrl}/${transactionId}`, {
                headers: this.getAuthHeaders(),
                credentials: 'include' // Important for sessions/cookies
            });

            if (!response.ok) {
                throw new Error('Failed to load transaction details');
            }

            const transaction = await response.json();
            console.log('Transaction details:', transaction); // Debug log

            // If sender details are missing, try to fetch them
            if (!transaction.sender || !transaction.sender.name) {
                try {
                    const senderId = transaction.senderId || (transaction.sender ? transaction.sender.id : null);
                    if (senderId) {
                        const userResponse = await fetch(`/api/users/${senderId}`, {
                            headers: this.getAuthHeaders(),
                            credentials: 'include'
                        });

                        if (userResponse.ok) {
                            const userData = await userResponse.json();
                            transaction.sender = userData;
                        }
                    }
                } catch (userError) {
                    console.error('Error fetching user details:', userError);
                }
            }

            // Render the transaction with the updated details
            this.renderTransactionDetails(transaction);

            // Mark as read if it's a received transaction
            if (transaction.type === 'received' && transaction.unread) {
                await this.markAsRead(transactionId);
            }
        } catch (error) {
            console.error('Error loading transaction details:', error);
            this.showError('Failed to load transaction details');
        }
    }

    // Get user display name from user object or direct name
    getUserDisplayName(user) {
        if (!user) return 'Unknown User';
        if (typeof user === 'string') return user || 'Unknown User';
        // Handle buyer/seller name directly from transaction
        if (user.buyerName) return user.buyerName;
        if (user.sellerName) return user.sellerName;
        // Handle user object with name/username
        return user.name || user.username || user.email || `User #${user.id || '?'}`;
    }

    // Get user contact info from user object or transaction
    getUserContactInfo(user) {
        if (!user) return { name: 'Unknown User' };
        if (typeof user === 'string') return { name: user };

        // Handle buyer/seller info directly from transaction
        if (user.buyerId || user.sellerId) {
            return {
                /*id: user.buyerId || user.sellerId,*/
                name: user.buyerName || user.sellerName || 'Unknown User',
                email: user.buyerEmail || user.sellerEmail || user.email || '',
                phone: user.buyerPhone || user.sellerPhone || user.phone || user.mobile || ''
            };
        }

        // Handle regular user object
        return {
            /*id: user.id,*/
            name: user.name || user.username || 'Unknown User',
            username: user.username,
            email: user.email || '',
            phone: user.phone || user.mobile || ''
        };
    }

    // Render transaction details in modal
    renderTransactionDetails(transaction) {
        // Validate input and get DOM elements
        if (!transaction) {
            console.error('No transaction data provided');
            this.showError('Failed to load transaction details');
            return;
        }

        const modal = document.getElementById('transactionDetailModal');
        if (!modal) {
            console.error('Transaction detail modal not found');
            return;
        }

        const title = modal.querySelector('.modal-title');
        const body = modal.querySelector('.modal-body');
        const footer = modal.querySelector('.modal-footer');

        if (!title || !body || !footer) {
            console.error('Required modal elements not found');
            return;
        }
        
        try {

            // Get requester and receiver info based on transaction type
            const isIncoming = this.currentTab === 'received';
            const transactionType = transaction.type || 'REQUEST'; // Default to REQUEST if null
            const isRequest = transactionType.toUpperCase() === 'REQUEST';

            // For REQUEST type, buyer is the requester and seller is the receiver
            // For other types, sender is the requester and receiver is the current user
            let requester, receiver;

            if (isRequest) {
                requester = {
                    id: transaction.buyerId,
                    buyerId: transaction.buyerId,
                    buyerName: transaction.buyerName,
                    buyerEmail: transaction.buyerEmail,
                    buyerPhone: transaction.buyerPhone,
                    email: transaction.buyerEmail,
                    phone: transaction.buyerPhone,
                    name: transaction.buyerName
                };
                receiver = {
                    id: transaction.sellerId,
                    sellerId: transaction.sellerId,
                    sellerName: transaction.sellerName,
                    sellerEmail: transaction.sellerEmail,
                    sellerPhone: transaction.sellerPhone,
                    email: transaction.sellerEmail,
                    phone: transaction.sellerPhone,
                    name: transaction.sellerName
                };
            } else {
                // Fallback to the original logic for other transaction types
                requester = isIncoming ? (transaction.sender || {}) : (this.currentUser || {});
                receiver = isIncoming ? (this.currentUser || {}) : (transaction.receiver || {});

                // Ensure we have the basic fields
                requester = {
                    ...requester,
                    id: requester.id || transaction.buyerId,
                    name: requester.name || transaction.buyerName,
                    email: requester.email || transaction.buyerEmail,
                    phone: requester.phone || requester.mobile || transaction.buyerPhone
                };
                receiver = {
                    ...receiver,
                    id: receiver.id || transaction.sellerId,
                    name: receiver.name || transaction.sellerName,
                    email: receiver.email || transaction.sellerEmail,
                    phone: receiver.phone || receiver.mobile || transaction.sellerPhone
                };
            }

            // Set modal title
            title.textContent = `Transaction #${transaction.id || ''}`;

            // Get display names and contact info
            const requesterName = this.getUserDisplayName(requester);
            const requesterContact = this.getUserContactInfo(requester);
            const receiverName = this.getUserDisplayName(receiver);
            const receiverContact = this.getUserContactInfo(receiver);

            // Determine which contact info to show based on transaction direction
            const displayContact = isIncoming ? requesterContact : receiverContact;
            const displayName = isIncoming ? requesterName : receiverName;

            // Render transaction details with requester info
            body.innerHTML = `
                <div class="row mb-4">
                    <div class="col-md-4">
                        <div class="card h-100">
                            <img src="${transaction.itemImage || '/images/default-item.svg'}"
                                class="card-img-top"
                                alt="${transaction.itemName || 'Item'}"
                                style="max-height: 200px; object-fit: contain; background: #f8f9fa;">
                        <div class="card-body">
                            <h5 class="card-title">${transaction.itemName || 'Item'}</h5>
                            <p class="card-text">${transaction.itemDescription || 'No description available'}</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-8">
                    <div class="card h-100">
                        <div class="card-header">
                            <h5 class="mb-0">Transaction Details</h5>
                        </div>
                        <div class="card-body">
                            <div class="mb-3">
                                <h6>Status:</h6>
                                <span class="badge bg-${transaction.status ? this.getStatusBadgeClass(transaction.status) : 'secondary'}">
                                    ${transaction.status ? this.formatStatus(transaction.status) : 'PENDING'}
                                </span>
                            </div>

                            <div class="mb-3">
                                <h6>${isIncoming ? 'From' : 'To'}:</h6>
                                <div class="p-2 bg-light rounded">
                                    <div class="d-flex align-items-center mb-2">
                                        <i class="fas fa-user-circle me-2 fs-4"></i>
                                        <strong>${displayName}</strong>
                                    </div>
                                    ${displayContact.email ? `<div class="mt-1"><i class="fas fa-envelope me-2"></i>${displayContact.email}</div>` : ''}
                                    ${displayContact.phone ? `<div class="mt-1"><i class="fas fa-phone me-2"></i>${displayContact.phone}</div>` : ''}
                                    ${!displayContact.email && !displayContact.phone ?
                                        '<div class="text-muted small">No contact information available</div>' : ''}
                                </div>
                            </div>

                            <div class="mb-3">
                                <h6>Transaction Type:</h6>
                                <p>${this.formatType(transaction.type)}</p>
                            </div>

                            <div class="mb-3">
                                <h6>Date:</h6>
                                <p>${this.formatDate(transaction.createdAt, true)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add action buttons for received requests that are pending or have null status
        const isPending = transaction.status === 'PENDING' || transaction.status === 'pending' || !transaction.status;
        const showActions = (isIncoming || transaction.type === 'received') && isPending;
        
        if (showActions) {
            footer.innerHTML = `
                <button type="button" class="btn btn-success" id="acceptBtn">
                    <i class="fas fa-check me-1"></i> Accept
                </button>
                <button type="button" class="btn btn-danger" id="rejectBtn">
                    <i class="fas fa-times me-1"></i> Reject
                </button>
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            `;

            // Add event listeners for accept/reject buttons
            document.getElementById('acceptBtn').addEventListener('click', () => {
                this.updateTransactionStatus(transaction.id, 'ACCEPTED');
            });

            document.getElementById('rejectBtn').addEventListener('click', () => {
                this.updateTransactionStatus(transaction.id, 'REJECTED');
            });
        } else {
            footer.innerHTML = `
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            `;
        }

            // Show the modal (using the existing instance)
            if (this.currentModal) {
                this.currentModal.show();
            }
        } catch (error) {
            console.error('Error rendering transaction details:', error);
            this.showError('An error occurred while loading transaction details');
        }
    }

    // Update transaction status (accept/reject)
    async updateTransactionStatus(transactionId, status) {
        try {
            // The backend gets the user from the authentication token
            // and expects the status as a query parameter
            const response = await fetch(`${this.baseUrl}/${transactionId}/status?status=${status.toUpperCase()}`, {
                method: 'PUT',
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to update transaction status');
            }

            const updatedTransaction = await response.json();
            console.log('Transaction updated successfully:', updatedTransaction);

            // Reload the transactions to reflect the changes
            this.loadTransactions();

            // Show success message
            this.showSuccess(`Transaction ${status} successfully`);
            
            // Close and clean up the modal
            if (this.currentModal) {
                this.currentModal.hide();
                
                // Manually clean up the modal backdrop and body classes
                const backdrops = document.querySelectorAll('.modal-backdrop');
                backdrops.forEach(backdrop => backdrop.remove());
                
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
                
                const modal = document.getElementById('transactionDetailModal');
                if (modal) {
                    modal.style.display = 'none';
                    modal.setAttribute('aria-hidden', 'true');
                }
            }
            
            // Reload transactions to reflect changes
            this.loadTransactions();
        } catch (error) {
            console.error('Error updating transaction status:', error);
            this.showError(error.message || 'Failed to update transaction status');
        }
    }

    // Mark notification as read
    async markAsRead(transactionId) {
        try {
            await fetch(`${this.notificationUrl}/${transactionId}/read`, {
                method: 'PUT',
                headers: this.getAuthHeaders()
            });
            
            // Update the UI
            const badge = document.querySelector(`[data-transaction-id="${transactionId}"] .notification-badge`);
            if (badge) badge.remove();
            
            // Update notification count
            this.loadNotifications();
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    }

    // Render notification dropdown
    renderNotificationDropdown(notifications) {
        const dropdown = document.getElementById('notificationDropdown');
        if (!dropdown) return;
        
        if (!notifications || notifications.length === 0) {
            dropdown.innerHTML = `
                <li><h6 class="dropdown-header">No new notifications</h6></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item text-center py-2" href="#">All caught up!</a></li>
            `;
            return;
        }
        
        let html = '<li><h6 class="dropdown-header">New Notifications</h6></li>';
        html += '<li><hr class="dropdown-divider"></li>';
        
        notifications.slice(0, 5).forEach(notification => {
            html += `
                <li>
                    <a class="dropdown-item" href="#" data-id="${notification.id}">
                        <div class="d-flex align-items-center">
                            <div class="flex-shrink-0 me-2">
                                <img src="${notification.senderAvatar || '/images/default-item.svg'}"
                                     class="rounded-circle" width="32" height="32" 
                                     alt="${notification.senderName}">
                            </div>
                            <div class="flex-grow-1">
                                <div class="fw-bold">${notification.title}</div>
                                <small class="text-muted">${notification.message}</small>
                            </div>
                            ${notification.unread ? '<span class="badge bg-danger rounded-pill">New</span>' : ''}
                        </div>
                    </a>
                </li>
                <li><hr class="dropdown-divider"></li>
            `;
        });
        
        if (notifications.length > 5) {
            html += `
                <li>
                    <a class="dropdown-item text-center" href="/transactions.html">
                        View all notifications
                    </a>
                </li>
            `;
        }
        
        dropdown.innerHTML = html;
        
        // Add click handlers for notification items
        dropdown.querySelectorAll('[data-id]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const notificationId = item.getAttribute('data-id');
                this.handleNotificationClick(notificationId);
            });
        });
    }

    // Handle notification click
    handleNotificationClick(notificationId) {
        // In a real app, this would navigate to the relevant transaction
        // For now, we'll just mark it as read
        this.markAsRead(notificationId);
        
        // Close the dropdown
        const dropdown = bootstrap.Dropdown.getInstance(document.querySelector('[data-bs-toggle="dropdown"]'));
        if (dropdown) dropdown.hide();
    }

    // Show notification toast
    showNotificationToast(notification) {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;
        
        const toastId = `toast-${Date.now()}`;
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.className = 'toast align-items-center text-white bg-primary border-0';
        toast.role = 'alert';
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <strong>${notification.title}</strong><br>
                    ${notification.message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" 
                        data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        // Initialize and show the toast
        const bsToast = new bootstrap.Toast(toast, {
            autohide: true,
            delay: 5000
        });
        
        bsToast.show();
        
        // Remove the toast after it's hidden
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
        
        // Click handler to navigate to transaction
        toast.addEventListener('click', () => {
            this.showTransactionDetails(notification.transactionId);
            bsToast.hide();
        });
    }

    // Show success message
    showSuccess(message) {
        this.showToast(message, 'success');
    }

    // Show error message
    showError(message) {
        this.showToast(message, 'danger');
    }

    // Format date to a readable string
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Invalid Date';
            
            return date.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch (error) {
            console.error('Error formatting date:', error, 'Date string:', dateString);
            return 'Invalid Date';
        }
    }
    
    // Show toast message
    showToast(message, type = 'info') {
        let toastContainer = document.getElementById('toastContainer');
        
        // Create container if it doesn't exist
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.className = 'toast-container position-fixed top-0 start-50 translate-middle-x p-3';
            toastContainer.style.zIndex = '9999';
            toastContainer.style.marginTop = '70px';
            document.body.appendChild(toastContainer);
        }
        
        const toastId = `toast-${Date.now()}`;
        
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.className = `toast align-items-center text-white bg-${type} border-0 shadow-lg`;
        toast.role = 'alert';
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        toast.style.minWidth = '300px';
        
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas fa-${this.getToastIcon(type)} me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" 
                        data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        const bsToast = new bootstrap.Toast(toast, {
            autohide: true,
            delay: 4000
        });
        
        bsToast.show();
        
        // Remove the toast after it's hidden
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }
    
    getToastIcon(type) {
        const icons = {
            'success': 'check-circle',
            'danger': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }
    
    // Handle notification click
    handleNotificationClick(notificationId) {
        // In a real app, this would navigate to the relevant transaction
        // For now, we'll just mark it as read
        this.markAsRead(notificationId);
        
        // Close the dropdown
        const dropdown = bootstrap.Dropdown.getInstance(document.querySelector('[data-bs-toggle="dropdown"]'));
        if (dropdown) dropdown.hide();
    }
    
    // Show notification toast
    showNotificationToast(notification) {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;
        
        const toastId = `toast-${Date.now()}`;
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.className = 'toast align-items-center text-white bg-primary border-0';
        toast.role = 'alert';
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
    
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <strong>${notification.title}</strong><br>
                    ${notification.message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" 
                        data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        // Initialize and show the toast
        const bsToast = new bootstrap.Toast(toast, {
            autohide: true,
            delay: 5000
        });
        
        bsToast.show();
        
        // Remove the toast after it's hidden
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
        
        // Click handler to navigate to transaction
        toast.addEventListener('click', () => {
            this.showTransactionDetails(notification.transactionId);
            bsToast.hide();
        });
    }

    // Show success message
    showSuccess(message) {
        this.showToast(message, 'success');
    }

    // Show error message
    showError(message) {
        this.showToast(message, 'danger');
    }

    // Format date to a readable string
    formatDate(dateString) {
        if (!dateString) return '';
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return new Date(dateString).toLocaleDateString('en-US', options);
    }
    
    // Format status for display
    formatStatus(status) {
        const statusMap = {
            'pending': 'Pending',
            'accepted': 'Accepted',
            'rejected': 'Rejected',
            'completed': 'Completed',
            'cancelled': 'Cancelled'
        };
        return statusMap[status] || status;
    }

    // Get status badge class
    getStatusBadgeClass(status) {
        const statusClasses = {
            'pending': 'warning',
            'accepted': 'success',
            'rejected': 'danger',
            'completed': 'info',
            'cancelled': 'secondary'
        };
        
        return statusClasses[status] || 'secondary';
    }

    // Format transaction type
    formatType(type) {
        const typeMap = {
            'buy': 'Purchase',
            'sell': 'Sale',
            'swap': 'Swap',
            'donation': 'Donation',
            'request': 'Item Request'
        };
        
        return typeMap[type] || type;
    }
    // Get transaction description
    getTransactionDescription(transaction) {
        try {
            if (!transaction) return 'New transaction';
            
            const { type, status } = transaction;
            const isIncoming = this.currentTab === 'received';
            
            // Safely get sender/receiver names with fallbacks
            let senderName = 'Someone';
            let receiverName = 'you';
            
            // Handle different sender/receiver object structures
            if (transaction.sender) {
                if (typeof transaction.sender === 'object') {
                    senderName = transaction.sender.name || 
                               transaction.sender.username || 
                               transaction.sender.email?.split('@')[0] || 
                               'Someone';
                } else if (typeof transaction.sender === 'string') {
                    senderName = transaction.sender;
                }
            } else if (transaction.senderName) {
                senderName = transaction.senderName;
            }
            
            if (transaction.receiver) {
                if (typeof transaction.receiver === 'object') {
                    receiverName = transaction.receiver.name || 
                                 transaction.receiver.username || 
                                 transaction.receiver.email?.split('@')[0] || 
                                 'you';
                } else if (typeof transaction.receiver === 'string') {
                    receiverName = transaction.receiver;
                }
            } else if (transaction.receiverName) {
                receiverName = transaction.receiverName;
            }
            
            const otherParty = isIncoming ? senderName : receiverName;
            const transactionType = (type || '').toUpperCase();
            
            const descriptions = {
                'BUY': isIncoming 
                    ? `${otherParty} wants to buy this item`
                    : `You requested to buy from ${otherParty}`,
                'SELL': isIncoming
                    ? `${otherParty} wants to sell you an item`
                    : `You offered to sell to ${otherParty}`,
                'SWAP': isIncoming
                    ? `${otherParty} wants to swap items with you`
                    : `You requested to swap with ${otherParty}`,
                'DONATION': isIncoming
                    ? `${otherParty} requested this item as a donation`
                    : `You requested this item as a donation`,
                'REQUEST': isIncoming
                    ? `${otherParty} sent you an item request`
                    : `You sent an item request to ${otherParty}`
            };
            
            return descriptions[transactionType] || 'New transaction';
        } catch (error) {
            console.error('Error generating transaction description:', error);
            return 'New transaction';
        }
    }

    // Get empty state HTML
    getEmptyState(message, icon = 'inbox') {
        return `
            <div class="empty-state">
                <i class="fas fa-${icon} fa-3x mb-3"></i>
                <p class="text-muted">${message}</p>
            </div>
        `;
    }

    // Load and update both received and sent transaction counts
    async loadAndUpdateCounts() {
        try {
            // Fetch both received and sent transactions
            const [receivedResponse, sentResponse] = await Promise.all([
                fetch(`${this.baseUrl}/received`, {
                    method: 'GET',
                    headers: this.getAuthHeaders(),
                    credentials: 'include'
                }),
                fetch(`${this.baseUrl}/sent`, {
                    method: 'GET',
                    headers: this.getAuthHeaders(),
                    credentials: 'include'
                })
            ]);

            if (!receivedResponse.ok || !sentResponse.ok) {
                throw new Error('Failed to load transaction counts');
            }

            const receivedTransactions = await receivedResponse.json();
            const sentTransactions = await sentResponse.json();

            // Update the UI with the counts
            this.updateCounts({
                received: receivedTransactions.length,
                sent: sentTransactions.length
            });
        } catch (error) {
            console.error('Error loading transaction counts:', error);
            // Don't show error to user as it's not critical functionality
        }
    }

    // Update transaction counts in the UI
    updateCounts(counts) {
        const receivedBadge = document.getElementById('receivedCount');
        const sentBadge = document.getElementById('sentCount');
        
        if (receivedBadge) receivedBadge.textContent = counts.received || 0;
        if (sentBadge) sentBadge.textContent = counts.sent || 0;
    }
}

// Note: TransactionManager is initialized from transactions.html
// This ensures WebSocket libraries are loaded first

// Helper function to set up event listeners after TransactionManager is initialized
window.setupTransactionEventListeners = function(transactionManager) {
    // Set up filter buttons
    document.querySelectorAll('[data-filter]').forEach(button => {
        button.addEventListener('click', (e) => {
            const filter = e.currentTarget.getAttribute('data-filter');
            transactionManager.loadTransactions(filter);
        });
    });
    
    // Set up tab change handler
    const tabEls = document.querySelectorAll('button[data-bs-toggle="tab"]');
    tabEls.forEach(tabEl => {
        tabEl.addEventListener('shown.bs.tab', (event) => {
            const target = event.target.getAttribute('data-bs-target');
            // Update current tab and reload transactions
            if (target === '#received-tab') {
                transactionManager.currentTab = 'received';
            } else if (target === '#sent-tab') {
                transactionManager.currentTab = 'sent';
            }
            transactionManager.loadTransactions();
        });
    });
}

function filterTransactions(filterType) {
    const transactionManager = window.transactionManager;
    if (!transactionManager) {
        console.error('TransactionManager not found');
        return;
    }

    // Update the active tab UI
    document.querySelectorAll('.nav-tabs .nav-link').forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('data-filter') === filterType) {
            tab.classList.add('active');
        }
    });

    // Update the current tab in the transaction manager
    transactionManager.currentTab = filterType;

    // Reload transactions with the new filter
    transactionManager.loadTransactions();
}

// Add event listeners for the filter buttons
document.addEventListener('DOMContentLoaded', function() {
    // Add click handlers for the filter tabs
    document.querySelectorAll('.nav-tabs .nav-link').forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            const filterType = this.getAttribute('data-filter');
            filterTransactions(filterType);
        });
    });

    // Initialize with the default filter
    filterTransactions('received');
});
