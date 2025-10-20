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
        //console.log('Initializing TransactionManager with user:', this.currentUser);

        if (!this.currentUser || !this.currentUser.id) {
            const error = 'No valid user found. Please log in to view transactions';
            console.warn(error);
            this.showError(error);
            return;
        }

        try {
            // Initialize WebSocket
            await this.initializeWebSocket();
            
            // Load initial data
            await this.loadInitialData();
            
            console.log('TransactionManager initialized successfully');
            
        } catch (error) {
            const errorMsg = error.message || 'Failed to initialize TransactionManager';
            console.error('Initialization error:', errorMsg, error);
            this.showError(errorMsg);
            throw error; // Re-throw to be caught by the global error handler
        }
    }

    // Load initial data when the page loads
    async loadInitialData() {
        try {
            // Load transactions for the current tab
            await this.loadTransactions();

            // Load unread notifications
            await this.loadNotifications();

            //console.log('Initial data loaded successfully');
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
            // Check if we have a user in the global scope first
            if (window.currentUser && window.currentUser.userId) {
                //console.log('Found user in window.currentUser:', window.currentUser);
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
            
            //console.log('Created user object from localStorage:', user);
            
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
            const response = await fetch(`${this.notificationUrl}/unread`, {
                method: 'GET',
                headers: this.getAuthHeaders(),
                credentials: 'include' // Important for cookies/sessions
            });

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

    // Helper: fetch item details by id (returns null on failure)
    async fetchItemDetails(itemId) {
        if (!itemId) return null;
        try {
            const response = await fetch(`/api/items/${itemId}`, {
                headers: this.getAuthHeaders(),
                credentials: 'include'
            });
            if (!response.ok) {
                console.warn('Failed to fetch item details for id', itemId, response.status);
                return null;
            }
            const item = await response.json();
            return item;
        } catch (error) {
            console.error('Error fetching item details for id', itemId, error);
            return null;
        }
    }

    // Render transaction details in modal
    renderTransactionDetails(transaction) {

        // Validate input and get DOM elements
        if (!transaction) {
            console.error('No transaction data provided');
            this.showError('Failed to load transaction details');
            return;
        }
        
        // Check if this is a sent request (current user is the sender) with ACCEPTED status
        // Update the sender check to use sellerId and buyerId
        const currentUserId = this.currentUser?.id?.toString();
        const isBuyer = currentUserId === transaction.buyerId?.toString();
        const isSeller = currentUserId === transaction.sellerId?.toString();

        // Show rating section if the current user is the buyer and status is ACCEPTED
        const shouldShowRating = isBuyer && transaction.status === 'ACCEPTED';

        console.log('Rating section conditions:', {
            currentUserId: currentUserId,
            sellerId: transaction.sellerId,
            buyerId: transaction.buyerId,
            isSeller,
            status: transaction.status,
            shouldShowRating
        });
        
        // Store the transaction ID for rating functionality
        this.currentTransaction = transaction;
        
        const ratingSectionId = `ratingSection-${transaction.id}`;

        if (shouldShowRating) {
            console.log('Adding rating section to sent and accepted transaction');

            // First add the rating section to the DOM
            const ratingSection = this.addRatingSection(transaction, shouldShowRating);

            if (ratingSection) {
                // Initialize the rating section immediately
                this.initializeRatingSection(transaction).catch(error => {
                    console.error('Error initializing rating section:', error);
                });
            }
        }

        // Function to initialize the rating section after it's added to the DOM
        const initRatingSection = async () => {
            console.log('Initializing rating section for transaction:', transaction.id);
            
            // First, ensure the rating section is added to the DOM
            if (!document.getElementById(ratingSectionId) && !addRatingSection()) {
                console.error('Failed to add rating section to the DOM');
                return;
            }
            
            // Then initialize it
            try {
                await this.initializeRatingSection(transaction);
                console.log('Rating section initialized successfully');
            } catch (error) {
                console.error('Error initializing rating section:', error);
            }
        };
        
        // Get modal elements
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

        // Store the current scroll position
        const scrollPosition = window.scrollY;
        
        // Show the modal first
        if (this.currentModal) {
            this.currentModal.show();
        }
        
        // Only add and initialize rating section for sent and accepted requests
        if (shouldShowRating) {
            console.log('Adding rating section for sent and accepted transaction');
            this.initializeRatingSection(transaction).catch(error => {
                console.error('Error initializing rating section:', error);
            });
        } else {
            console.log('Skipping rating section. Reason:',
                !shouldShowRating ? 'Buyer is not the current user or Status is not ACCEPTED' :
                'Unknown reason');
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

                            <!-- Swap item placeholder: will be populated if buyer offered an item -->
                            <div id="swapItemSection-${transaction.id}" class="mb-3">
                                <!-- swap item will be injected here if present -->
                            </div>

                            <!-- Rating Section (only show for completed/accepted transactions where current user is buyer) -->
                            ${(transaction.status === 'ACCEPTED' || transaction.status === 'COMPLETED') && 
                              this.currentUser && this.currentUser.id === transaction.buyerId ? `
                            <div class="mt-4 pt-3 border-top">
                                <h6>Rate This Transaction</h6>
                                <div id="ratingSection-${transaction.id}" class="rating-section mt-2">
                                    <div class="d-flex align-items-center">
                                        <div class="rating-stars me-3" style="font-size: 1.5rem;">
                                            ${[1, 2, 3, 4, 5].map(star => `
                                                <i class="far fa-star" data-rating="${star}" 
                                                   style="cursor: pointer; color: #ffc107; margin-right: 5px;"
                                                   onmouseover="this.classList.replace('far', 'fas')" 
                                                   onmouseout="this.classList.replace('fas', 'far')"></i>
                                            `).join('')}
                                        </div>
                                        <button id="rateTransactionBtn-${transaction.id}" class="rate-transaction-btn btn btn-sm btn-outline-primary">
                                            <i class="fas fa-star me-1"></i> Rate This Transaction
                                        </button>
                                    </div>
                                    <div id="existingRating-${transaction.id}" class="existing-rating mt-2 d-none">
                                        <div class="alert alert-info p-2 mb-0">
                                            <i class="fas fa-check-circle me-1"></i> 
                                            You've rated this transaction
                                            <span id="userRatingStars-${transaction.id}" class="text-warning"></span>
                                            <button id="editRatingBtn-${transaction.id}" class="edit-rating-btn btn btn-sm btn-link p-0 ms-2">
                                                <i class="fas fa-edit"></i> Edit
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

            // Inject swap item details if available
            (async () => {
                try {
                    const swapContainer = document.getElementById(`swapItemSection-${transaction.id}`);
                    if (!swapContainer) return;

                    // If transaction has swapItemName or swapItemId, try to show it
                    if (transaction.swapItemId || transaction.swapItemName) {
                        // Show a loading placeholder
                        swapContainer.innerHTML = `
                            <h6>Buyer's offered item for swap:</h6>
                            <div class="text-center py-3" id="swapLoading-${transaction.id}">
                                <div class="spinner-border text-secondary" role="status"><span class="visually-hidden">Loading...</span></div>
                            </div>
                        `;

                        let swapItem = null;

                        // Prefer using swapItemName from response; if missing, fetch full item details
                        if (transaction.swapItemName && !transaction.swapItemId) {
                            // Only a name available
                            swapItem = { id: null, title: transaction.swapItemName, imageUrls: [], description: '' };
                        } else if (transaction.swapItemId) {
                            // Try to fetch item details; fall back to swapItemName if fetch fails
                            const fetched = await this.fetchItemDetails(transaction.swapItemId);
                            if (fetched) {
                                // Normalize to expected fields
                                swapItem = {
                                    id: fetched.id,
                                    title: fetched.title || fetched.name || transaction.swapItemName || 'Offered item',
                                    imageUrls: fetched.imageUrls || (fetched.image ? [fetched.image] : []),
                                    description: fetched.description || fetched.itemDescription || ''
                                };
                            } else {
                                // Fallback to swapItemName if provided
                                swapItem = { id: transaction.swapItemId, title: transaction.swapItemName || 'Offered item', imageUrls: [], description: '' };
                            }
                        }

                        // Build HTML
                        const swapHtml = `
                            <h6>Buyer's offered item for swap:</h6>
                            <div class="card">
                                <div class="row g-0 align-items-center">
                                    <div class="col-auto p-3">
                                        <img src="${(swapItem && swapItem.imageUrls && swapItem.imageUrls.length>0) ? swapItem.imageUrls[0] : '/images/default-item.svg'}"
                                             alt="${swapItem ? swapItem.title : 'Swap item'}" style="width:100px; height:100px; object-fit:cover;">
                                    </div>
                                    <div class="col">
                                        <div class="card-body py-2">
                                            <h6 class="card-title mb-1">${swapItem ? this.escapeHtml(swapItem.title) : 'Offered item'}</h6>
                                            <p class="card-text small text-muted mb-0">${swapItem ? this.escapeHtml(swapItem.description || '') : ''}</p>
                                            ${swapItem && swapItem.id ? `<div class="mt-2"><a href="/item-details.html?id=${swapItem.id}" target="_blank" class="btn btn-sm btn-outline-secondary">View item</a></div>` : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;

                        swapContainer.innerHTML = swapHtml;
                    } else {
                        // No swap item offered; clear placeholder
                        swapContainer.innerHTML = '';
                    }
                } catch (err) {
                    console.error('Error injecting swap item into modal:', err);
                    const swapContainer = document.getElementById(`swapItemSection-${transaction.id}`);
                    if (swapContainer) swapContainer.innerHTML = '<div class="text-muted small">Failed to load offered swap item</div>';
                }
            })();

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
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                        Close
                    </button>
                `;
            }

            // Show the modal (using the existing instance)
            if (this.currentModal) {
                console.log('Initializing transaction modal...');
                
                // Show the modal first
                this.currentModal.show();
                console.log('Modal shown');
                
                // Initialize rating section if this is an accepted/completed transaction
                const isStatusValid = transaction.status === 'ACCEPTED' || transaction.status === 'COMPLETED';
                const isBuyer = Number(this.currentUser.id) === transaction.buyerId;
                
                console.log('Modal initialization - isStatusValid:', isStatusValid, 'isBuyer:', isBuyer);
                
                if (isStatusValid && isBuyer) {
                    console.log('Initializing rating section for transaction:', transaction.id);
                    // Use setTimeout to ensure the modal is fully rendered
                    setTimeout(() => {
                        this.initializeRatingSection(transaction);
                    }, 100);
                } else {
                    console.log('Skipping rating section initialization. Reason:', 
                        !isStatusValid ? 'Transaction status is not ACCEPTED/COMPLETED' : 'User is not the buyer');
                }
            }
        } catch (error) {
           console.error('Error rendering transaction modal:', error);
           alert('Failed to load transaction details. Please try again.');
        }

    }

    addRatingSection(transaction, shouldShowRating) {
        if (!shouldShowRating) {
            console.log('Skipping rating section - conditions not met');
            return null;
        }

        console.log('Adding rating section for transaction:', transaction.id);

        // Remove any existing rating section first
        const existingRating = document.getElementById(`ratingSection-${transaction.id}`);
        if (existingRating) {
            existingRating.remove();
        }

        // Create the rating section
        const ratingSection = document.createElement('div');
        ratingSection.id = `ratingSection-${transaction.id}`;
        ratingSection.className = 'rating-section mt-3';
        ratingSection.style.display = 'block';

        // Add the rating HTML
        ratingSection.innerHTML = `
            <div class="border-top pt-3">
                <h5>Rate this Transaction</h5>
                <div class="d-flex align-items-center">
                    <div class="star-rating" id="ratingStars-${transaction.id}">
                        ${[1, 2, 3, 4, 5].map(star => `
                            <i class="far fa-star star" data-rating="${star}" style="font-size: 1.5rem; cursor: pointer; margin-right: 5px;"></i>
                        `).join('')}
                        <span class="ms-2" id="ratingText-${transaction.id}">0/5</span>
                    </div>
                    <button id="submitRating-${transaction.id}" class="btn btn-sm btn-primary ms-3">Submit</button>
                </div>
                <div class="mt-2">
                    <textarea id="ratingComment-${transaction.id}" class="form-control" rows="2"
                              placeholder="Add a comment (optional)"></textarea>
                </div>
            </div>
        `;

        // Find the modal body where transaction details are loaded
        const modalBody = document.querySelector('#transactionDetailModal .modal-body');
        if (modalBody) {
            // Try to find a good place to insert the rating section
            const transactionDate = modalBody.querySelector('.transaction-date');
            if (transactionDate && transactionDate.parentNode) {
                transactionDate.parentNode.insertBefore(ratingSection, transactionDate.nextSibling);
            } else {
                modalBody.appendChild(ratingSection);
            }
        }

        console.log('Rating section added with ID:', ratingSection.id);
        return ratingSection;
    }

    // Update transaction status (accept/reject)
    async updateTransactionStatus(transactionId, status) {
        try {
            // The backend gets the user from the authentication token
            // and expects the status as a query parameter
            const url = this.baseUrl + '/' + transactionId + '/status?status=' + status.toUpperCase();
            const response = await fetch(url, {
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
            this.showToast('Transaction ' + status + ' successfully', 'success');
            
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
            await fetch(this.notificationUrl + '/' + transactionId + '/read', {
                method: 'PUT',
                headers: this.getAuthHeaders()
            });
            
            // Update the UI
            const badge = document.querySelector('[data-transaction-id="' + transactionId + '"] .notification-badge');            if (badge) badge.remove();
            
            // Update notification count
            this.loadNotifications();
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    }

    /**
     * Renders the notification dropdown with the provided notifications
     * @param {Array} notifications - Array of notification objects
     */
    renderNotificationDropdown(notifications) {
        const dropdown = document.getElementById('notificationDropdown');
        if (!dropdown) {
            console.warn('Notification dropdown element not found');
            return;
        }

        try {
            let html = '';

            if (!notifications || notifications.length === 0) {
                dropdown.innerHTML = [
                    '<li><h6 class="dropdown-header">No new notifications</h6></li>',
                    '<li><hr class="dropdown-divider"></li>',
                    '<li><a class="dropdown-item text-center py-2" href="#">All caught up!</a></li>'
                ].join('');
                return;
            }

            // Display up to 5 most recent notifications
            const recentNotifications = notifications.slice(0, 5);
            
            recentNotifications.forEach(notification => {
                if (!notification) return;
                
                const senderName = this.escapeHtml(notification.senderName || 'Unknown');
                const title = this.escapeHtml(notification.title || 'New notification');
                const message = this.escapeHtml(notification.message || '');
                const avatarSrc = this.escapeHtml(notification.senderAvatar || '/images/default-item.svg');
                const isUnread = notification.unread ? '<span class="badge bg-danger rounded-pill">New</span>' : '';

                html += [
                    '<li>',
                    '  <a class="dropdown-item" href="#" data-id="', (notification.id || ''), '">',
                    '    <div class="d-flex align-items-center">',
                    '      <div class="flex-shrink-0 me-2">',
                    '        <img src="', avatarSrc, '" class="rounded-circle" width="32" height="32"',
                    '             alt="', senderName, '" onerror="this.onerror=null; this.src=\'/images/default-item.svg\'">',
                    '      </div>',
                    '      <div class="flex-grow-1">',
                    '        <div class="fw-bold">', title, '</div>',
                    '        <small class="text-muted">', message, '</small>',
                    '      </div>',
                    '      ', isUnread,
                    '    </div>',
                    '  </a>',
                    '</li>',
                    '<li><hr class="dropdown-divider"></li>'
                ].join('');
            });

            // Add view all link if there are more than 5 notifications
            if (notifications.length > 5) {
                html += [
                    '<li><a class="dropdown-item text-center" href="/notifications">',
                    '  <i class="fas fa-list me-1"></i> View All Notifications (', notifications.length, ')',
                    '</a></li>'
                ].join('');
            }

            dropdown.innerHTML = html;

            // Add click handlers for notification items
            const clickHandler = (e) => {
                e.preventDefault();
                const notificationId = e.currentTarget.getAttribute('data-id');
                if (notificationId && typeof this.handleNotificationClick === 'function') {
                    this.handleNotificationClick(notificationId);
                }
            };

            dropdown.querySelectorAll('[data-id]').forEach(item => {
                item.removeEventListener('click', clickHandler); // Remove existing handler to prevent duplicates
                item.addEventListener('click', clickHandler);
            });
        } catch (error) {
            console.error('Error rendering notification dropdown:', error);
            dropdown.innerHTML = [
                '<li><h6 class="dropdown-header text-danger">Error loading notifications</h6></li>',
                '<li><hr class="dropdown-divider"></li>',
                '<li><a class="dropdown-item text-center" href="#" onclick="window.location.reload()">',
                '  <i class="fas fa-sync-alt me-1"></i> Refresh',
                '</a></li>'
            ].join('');
        }
    }

    // Helper method to escape HTML special characters
    escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return unsafe;
        return unsafe
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
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
        // Create a safe reference to 'this' for use in callbacks
        const self = this;
        
        try {
            const toastContainer = document.getElementById('toastContainer');
            if (!toastContainer) {
                console.warn('Toast container not found');
                return;
            }
            
            // Create toast element
            const toastId = 'toast-' + Date.now();
            const toast = document.createElement('div');
            toast.id = toastId;
            toast.className = 'toast align-items-center text-white bg-primary border-0';
            toast.role = 'alert';
            toast.setAttribute('aria-live', 'assertive');
            toast.setAttribute('aria-atomic', 'true');
            
            // Ensure notification object exists and has required properties
            const title = notification?.title || 'Notification';
            const message = notification?.message || '';
            const transactionId = notification?.transactionId;
            
            // Create toast content
            const toastDiv = document.createElement('div');
            toastDiv.className = 'd-flex';
            
            const toastBody = document.createElement('div');
            toastBody.className = 'toast-body';
            
            // Add title
            if (title) {
                const titleEl = document.createElement('strong');
                titleEl.textContent = title;
                toastBody.appendChild(titleEl);
            }
            
            // Add message
            if (message) {
                if (title) toastBody.appendChild(document.createElement('br'));
                const messageEl = document.createElement('div');
                messageEl.textContent = message;
                toastBody.appendChild(messageEl);
            }
            
            // Add close button
            const closeButton = document.createElement('button');
            closeButton.type = 'button';
            closeButton.className = 'btn-close btn-close-white me-2 m-auto';
            closeButton.setAttribute('data-bs-dismiss', 'toast');
            closeButton.setAttribute('aria-label', 'Close');
            
            // Assemble toast
            toastDiv.appendChild(toastBody);
            toastDiv.appendChild(closeButton);
            toast.appendChild(toastDiv);
            
            // Add to container
            toastContainer.appendChild(toast);
            
            // Initialize Bootstrap toast
            if (typeof bootstrap !== 'undefined' && bootstrap.Toast) {
                const toastOptions = {
                    autohide: true,
                    delay: 5000
                };
                
                const bsToast = new bootstrap.Toast(toast, toastOptions);
                
                // Add click handler for transaction navigation if transactionId exists
                if (transactionId) {
                    toast.style.cursor = 'pointer';
                    const clickHandler = function() {
                        if (typeof self.showTransactionDetails === 'function') {
                            self.showTransactionDetails(transactionId);
                        }
                        bsToast.hide();
                    };
                    toast.addEventListener('click', clickHandler);
                }
                
                // Handle toast removal after hide
                const hiddenHandler = function() {
                    if (toast && toast.parentNode === toastContainer) {
                        toastContainer.removeChild(toast);
                        // Clean up event listeners
                        toast.removeEventListener('hidden.bs.toast', hiddenHandler);
                        if (transactionId) {
                            toast.removeEventListener('click', clickHandler);
                        }
                    }
                };
                
                toast.addEventListener('hidden.bs.toast', hiddenHandler);
                
                // Show the toast
                bsToast.show();
                
            } else {
                console.error('Bootstrap Toast not available');
                // Fallback: Auto-remove after delay
                setTimeout(() => {
                    if (toast.parentNode === toastContainer) {
                        toastContainer.removeChild(toast);
                    }
                }, 5000);
            }
        } catch (error) {
            console.error('Error showing notification toast:', error);
        }
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
        try {
            // Create a safe reference to 'this' for use in callbacks
            const self = this;
            
            // Get or create toast container
            let toastContainer = document.getElementById('toastContainer');
            if (!toastContainer) {
                toastContainer = document.createElement('div');
                toastContainer.id = 'toastContainer';
                toastContainer.className = 'toast-container position-fixed top-0 start-50 translate-middle-x p-3';
                toastContainer.style.zIndex = '9999';
                toastContainer.style.marginTop = '70px';
                document.body.appendChild(toastContainer);
            }
            
            // Create toast element
            const toastId = 'toast-' + Date.now();
            const toast = document.createElement('div');
            toast.id = toastId;
            toast.className = 'toast align-items-center text-white bg-' + type + ' border-0 shadow-lg';
            toast.role = 'alert';
            toast.setAttribute('aria-live', 'assertive');
            toast.setAttribute('aria-atomic', 'true');
            toast.style.minWidth = '300px';
            
            // Create toast content using DOM methods instead of innerHTML
            const toastDiv = document.createElement('div');
            toastDiv.className = 'd-flex';
            
            const toastBody = document.createElement('div');
            toastBody.className = 'toast-body';
            
            // Add icon
            const icon = document.createElement('i');
            icon.className = 'fas fa-' + this.getToastIcon(type) + ' me-2';
            toastBody.appendChild(icon);
            
            // Add message text
            const messageNode = document.createTextNode(message);
            toastBody.appendChild(messageNode);
            
            // Add close button
            const closeButton = document.createElement('button');
            closeButton.type = 'button';
            closeButton.className = 'btn-close btn-close-white me-2 m-auto';
            closeButton.setAttribute('data-bs-dismiss', 'toast');
            closeButton.setAttribute('aria-label', 'Close');
            
            // Assemble toast
            toastDiv.appendChild(toastBody);
            toastDiv.appendChild(closeButton);
            toast.appendChild(toastDiv);
            
            // Add to container
            toastContainer.appendChild(toast);
            
            // Initialize Bootstrap toast
            if (typeof bootstrap !== 'undefined' && bootstrap.Toast) {
                const toastOptions = {
                    autohide: true,
                    delay: 4000
                };
                
                const bsToast = new bootstrap.Toast(toast, toastOptions);
                
                // Handle toast removal after hide
                const hiddenHandler = function() {
                    if (toast && toast.parentNode === toastContainer) {
                        toast.remove();
                        toast.removeEventListener('hidden.bs.toast', hiddenHandler);
                    }
                };
                
                toast.addEventListener('hidden.bs.toast', hiddenHandler);
                
                // Show the toast
                bsToast.show();
                
                // Return the toast instance for potential external control
                return bsToast;
            } else {
                console.warn('Bootstrap Toast not available, using fallback');
                // Fallback: Auto-remove after delay
                setTimeout(() => {
                    if (toast.parentNode === toastContainer) {
                        toast.remove();
                    }
                }, 4000);
                return null;
            }
        } catch (error) {
            console.error('Error showing toast:', error);
            // Fallback to alert if something goes wrong
            window.alert(message);
            return null;
        }
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
        try {
            // Create a safe reference to 'this' for use in callbacks
            const self = this;
            
            // Get or create toast container
            let toastContainer = document.getElementById('toastContainer');
            if (!toastContainer) {
                toastContainer = document.createElement('div');
                toastContainer.id = 'toastContainer';
                toastContainer.className = 'toast-container position-fixed top-0 start-50 translate-middle-x p-3';
                toastContainer.style.zIndex = '9999';
                toastContainer.style.marginTop = '70px';
                document.body.appendChild(toastContainer);
            }
            
            // Create toast element
            const toastId = 'toast-' + Date.now();
            const toast = document.createElement('div');
            toast.id = toastId;
            toast.className = 'toast align-items-center text-white bg-primary border-0';
            toast.role = 'alert';
            toast.setAttribute('aria-live', 'assertive');
            toast.setAttribute('aria-atomic', 'true');
            toast.style.minWidth = '300px';
            
            // Create toast content using DOM methods instead of innerHTML
            const toastDiv = document.createElement('div');
            toastDiv.className = 'd-flex';
            
            const toastBody = document.createElement('div');
            toastBody.className = 'toast-body';
            
            // Add title
            if (notification.title) {
                const titleEl = document.createElement('strong');
                titleEl.textContent = notification.title;
                toastBody.appendChild(titleEl);
                
                // Add line break if there's a message
                if (notification.message) {
                    toastBody.appendChild(document.createElement('br'));
                }
            }
            
            // Add message
            if (notification.message) {
                const messageEl = document.createElement('div');
                messageEl.textContent = notification.message;
                toastBody.appendChild(messageEl);
            }
            
            // Add close button
            const closeButton = document.createElement('button');
            closeButton.type = 'button';
            closeButton.className = 'btn-close btn-close-white me-2 m-auto';
            closeButton.setAttribute('data-bs-dismiss', 'toast');
            closeButton.setAttribute('aria-label', 'Close');
            
            // Assemble toast
            toastDiv.appendChild(toastBody);
            toastDiv.appendChild(closeButton);
            toast.appendChild(toastDiv);
            
            // Add to container
            toastContainer.appendChild(toast);
            
            // Initialize Bootstrap toast
            if (typeof bootstrap !== 'undefined' && bootstrap.Toast) {
                const toastOptions = {
                    autohide: true,
                    delay: 5000
                };
                
                const bsToast = new bootstrap.Toast(toast, toastOptions);
                
                // Add click handler for transaction navigation if transactionId exists
                if (notification.transactionId) {
                    toast.style.cursor = 'pointer';
                    const clickHandler = function() {
                        if (typeof self.showTransactionDetails === 'function') {
                            self.showTransactionDetails(notification.transactionId);
                        }
                        bsToast.hide();
                    };
                    toast.addEventListener('click', clickHandler);
                }
                
                // Handle toast removal after hide
                const hiddenHandler = function() {
                    if (toast && toast.parentNode === toastContainer) {
                        toastContainer.removeChild(toast);
                        // Clean up event listeners
                        toast.removeEventListener('hidden.bs.toast', hiddenHandler);
                        if (notification.transactionId) {
                            toast.removeEventListener('click', clickHandler);
                        }
                    }
                };
                
                toast.addEventListener('hidden.bs.toast', hiddenHandler);
                
                // Show the toast
                bsToast.show();
                
                return bsToast;
            } else {
                console.warn('Bootstrap Toast not available, using fallback');
                // Fallback: Auto-remove after delay
                setTimeout(() => {
                    if (toast.parentNode === toastContainer) {
                        toastContainer.removeChild(toast);
                    }
                }, 5000);
                return null;
            }
        } catch (error) {
            console.error('Error showing notification toast:', error);
            // Fallback to simple alert if something goes wrong
            if (notification && notification.message) {
                window.alert(notification.message);
            }
            return null;
        }
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

    /**
     * Initialize the rating section in the transaction details modal
     * @param {Object} transaction - The transaction object
     */
    async initializeRatingSection(transaction) {
        try {
            const ratingSectionId = `ratingSection-${transaction.id}`;
            console.log('Initializing rating section for transaction:', transaction.id);

            // Verify the rating section exists in the DOM
            const ratingSection = document.getElementById(ratingSectionId);
            if (!ratingSection) {
                console.error(`Rating section not found in DOM: ${ratingSectionId}`);
                // Try to add it again
                const newSection = this.addRatingSection(transaction, true);
                if (!newSection) return;
            }

            // Set up the star rating UI
            this.setupStarRating(transaction.id);

            // Try to load existing rating
            try {
                const response = await fetch(`/api/ratings/transaction/${transaction.id}`, {
                    method: 'GET',
                    headers: this.getAuthHeaders()
                });

                if (response.status === 404) {
                    console.log('No existing rating found, ready for new rating');
                    return; // No rating exists yet, which is fine
                }

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const ratingData = await response.json();
                this.updateRatingUI(transaction, ratingData);

            } catch (error) {
                if (!error.message.includes('404')) {
                    console.error('Error fetching rating:', error);
                }
            }

        } catch (error) {
            console.error('Error in initializeRatingSection:', error);
        }
    }

    setupNewRating(transaction, ratingSection) {
        if (!ratingSection) return;

        // Reset any existing stars and text
        const stars = ratingSection.querySelectorAll('.star');
        const ratingText = ratingSection.querySelector(`#ratingText-${transaction.id}`);

        if (stars && ratingText) {
            stars.forEach(star => {
                star.className = 'far fa-star star';
                star.style.color = ''; // Reset color
            });
            ratingText.textContent = '0/5';
            ratingText.style.color = '';
        }

        // Set up event listeners for the stars
        this.setupStarRating(transaction.id);
    }

    setupStarRating(transactionId) {

        const transaction = this.currentTransaction;
        if (!transaction) {
            console.error('Transaction not available for rating');
            return;
        }

        const stars = document.querySelectorAll(`#ratingStars-${transactionId} .star`);
        const ratingText = document.getElementById(`ratingText-${transactionId}`);
        const submitButton = document.getElementById(`submitRating-${transactionId}`);
        const commentInput = document.getElementById(`ratingComment-${transactionId}`);

        if (!stars.length || !ratingText || !submitButton) {
            console.error('Required rating elements not found');
            return;
        }

        let selectedRating = 0;

        // Update stars display
        const updateStars = (rating, isHover = false) => {
            stars.forEach(star => {
                const starRating = parseInt(star.getAttribute('data-rating'));
                star.className = starRating <= rating ? 'fas fa-star star' : 'far fa-star star';
                star.style.color = starRating <= rating ? '#ffc107' : '';
            });
            ratingText.textContent = `${rating}/5`;
        };

        // Star click handler
        const onStarClick = (e) => {
            selectedRating = parseInt(e.currentTarget.getAttribute('data-rating'));
            updateStars(selectedRating);
        };

        // Star hover handlers
        const onStarHover = (e) => {
            const rating = parseInt(e.currentTarget.getAttribute('data-rating'));
            updateStars(rating, true);
        };

        const onStarHoverOut = () => {
            updateStars(selectedRating);
        };

        // Add event listeners
        stars.forEach(star => {
            star.addEventListener('click', onStarClick);
            star.addEventListener('mouseover', onStarHover);
            star.addEventListener('mouseout', onStarHoverOut);
        });

        // Submit handler
        const onSubmit = async () => {
            console.log('Transaction object:', JSON.stringify(transaction, null, 2));

            if (selectedRating === 0) {
                alert('Please select a rating before submitting');
                return;
            }

            try {
                if (!transaction) {
                    throw new Error('Transaction details not available');
                }

                // Get current user ID and ensure it's a number
                const currentUser = this.getCurrentUser();
                if (!currentUser || !currentUser.id) {
                    console.error('Current user not found or invalid');
                    throw new Error('You must be logged in to rate this transaction');
                }

                // Convert all IDs to numbers for consistent comparison
                const currentUserId = parseInt(currentUser.id, 10);
                const buyerId = parseInt(transaction.buyerId, 10);
                const sellerId = parseInt(transaction.sellerId, 10);

                console.log('Current user ID:', currentUserId, 'Type:', typeof currentUserId);
                console.log('Transaction buyer ID:', buyerId, 'Type:', typeof buyerId);
                console.log('Transaction seller ID:', sellerId, 'Type:', typeof sellerId);
                
                let ratedUserId;

                if (currentUserId === buyerId) {
                    // If current user is the buyer, rate the seller
                    ratedUserId = sellerId;
                    console.log('Rated seller with ID:', ratedUserId);
                } else if (currentUserId === sellerId) {
                    // If current user is the seller, rate the buyer
                    ratedUserId = buyerId;
                    console.log('Rated buyer with ID:', ratedUserId);
                } else {
                    console.error('Current user is not authorized to rate this transaction');
                    throw new Error('You are not authorized to rate this transaction');
                }

                // Ensure we have a valid numeric ID
                if (isNaN(ratedUserId) || ratedUserId <= 0) {
                    throw new Error(`Invalid user ID format: ${ratedUserId}`);
                }

                // Prepare the rating data with all required fields
                const ratingData = {
                    transactionId: Number(transaction.id),  // Include transactionId in the request body
                    ratedUserId: ratedUserId,
                    score: Number(selectedRating),
                    comment: (commentInput?.value || '').trim()
                };

                console.log('Submitting rating with data:', ratingData);

                // Use the transaction-specific rating endpoint
                const response = await fetch(`/api/ratings/transaction/${transaction.id}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...this.getAuthHeaders()
                    },
                    body: JSON.stringify(ratingData)
                });

                if (!response.ok) {
                    const error = await response.text();
                    throw new Error(error || 'Failed to submit rating');
                }

                const result = await response.json();
                console.log('Rating submitted successfully:', result);
                alert('Thank you for your rating!');

                // Disable the form after successful submission
                stars.forEach(star => {
                    star.removeEventListener('click', onStarClick);
                    star.removeEventListener('mouseover', onStarHover);
                    star.removeEventListener('mouseout', onStarHoverOut);
                    star.style.cursor = 'default';
                });

                submitButton.disabled = true;
                if (commentInput) commentInput.disabled = true;

            } catch (error) {
                console.error('Error submitting rating:', error);
                alert(`Failed to submit rating: ${error.message}`);
            }
        };

        // Add submit listener
        submitButton.addEventListener('click', onSubmit);
    }

    /**
     * Update the rating UI based on existing rating
     * @param {number} transactionId - The ID of the transaction being rated
     * @param {Object|null} rating - The existing rating or null if none exists
     */
    updateRatingUI(transactionId, rating) {
        const ratingSection = document.getElementById(`ratingSection-${transactionId}`);
        if (!ratingSection) {
            console.error('Rating section not found for transaction:', transactionId);
            return;
        }
        
        const existingRatingEl = ratingSection.querySelector('.existing-rating');
        const ratingStarsEl = ratingSection.querySelector('.rating-stars');
        const rateButton = ratingSection.querySelector('.rate-transaction-btn');
        
        if (!existingRatingEl || !ratingStarsEl || !rateButton) {
            console.error('Rating UI elements not found in section:', ratingSection);
            return;
        }
        
        if (rating) {
            // Show existing rating
            existingRatingEl.classList.remove('d-none');
            ratingStarsEl.style.display = 'none';
            rateButton.style.display = 'none';
            
            // Update the stars in the existing rating display
            const starsContainer = existingRatingEl.querySelector('.text-warning');
            if (starsContainer) {
                starsContainer.innerHTML = '';
                for (let i = 0; i < 5; i++) {
                    const star = document.createElement('i');
                    star.className = i < rating.rating ? 'fas fa-star' : 'far fa-star';
                    star.style.color = '#ffc107';
                    star.style.marginRight = '2px';
                    starsContainer.appendChild(star);
                }
                
                // Add the rating value as text
                const ratingText = document.createTextNode(` (${rating.rating}/5)`);
                starsContainer.appendChild(ratingText);
            }
        } else {
            // Show rating input (no existing rating)
            existingRatingEl.classList.add('d-none');
            ratingStarsEl.style.display = 'block';
            rateButton.style.display = 'block';
            
            // Reset star highlighting
            const stars = ratingStarsEl.querySelectorAll('.fa-star');
            this.highlightStars(stars, 0);
        }
    }

    /**
     * Set up event listeners for the rating functionality
     * @param {number} transactionId - The ID of the transaction being rated
     */
    setupRatingEventListeners(transactionId) {
        const ratingSection = document.getElementById(`ratingSection-${transactionId}`);
        if (!ratingSection) return;
        
        const stars = ratingSection.querySelectorAll('.rating-stars .fa-star');
        const rateButton = ratingSection.querySelector('.rate-transaction-btn');
        const editButton = ratingSection.querySelector('.edit-rating-btn');
        
        if (!stars.length || !rateButton) {
            console.error('Rating UI elements not found');
            return;
        }
        
        let selectedRating = 0;
        let isSubmitting = false;
        
        // Star hover effect
        stars.forEach(star => {
            star.addEventListener('mouseover', () => {
                const rating = parseInt(star.getAttribute('data-rating'));
                this.highlightStars(stars, rating);
            });
            
            star.addEventListener('click', () => {
                selectedRating = parseInt(star.getAttribute('data-rating'));
                this.highlightStars(stars, selectedRating);
            });
        });
        
        // Reset stars when mouse leaves the rating area
        ratingSection.querySelector('.rating-stars').addEventListener('mouseleave', () => {
            if (selectedRating === 0) {
                this.highlightStars(stars, 0);
            } else {
                this.highlightStars(stars, selectedRating);
            }
        });
        
        // Submit rating
        rateButton.addEventListener('click', async () => {
            if (isSubmitting || selectedRating === 0) return;
            
            isSubmitting = true;
            rateButton.disabled = true;
            rateButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Submitting...';
            
            try {
                const response = await fetch('/api/ratings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...this.getAuthHeaders()
                    },
                    body: JSON.stringify({
                        transactionId,
                        rating: selectedRating,
                        comment: '' // You can add a comment field if needed
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    this.showSuccess('Thank you for your rating!');
                    this.updateRatingUI(transactionId, { rating: selectedRating });
                } else {
                    throw new Error('Failed to submit rating');
                }
            } catch (error) {
                console.error('Error submitting rating:', error);
                this.showError('Failed to submit rating. Please try again.');
            } finally {
                isSubmitting = false;
                rateButton.disabled = false;
                rateButton.innerHTML = '<i class="fas fa-star me-1"></i> Rate This Transaction';
            }
        });
        
        // Edit rating
        if (editButton) {
            editButton.addEventListener('click', () => {
                selectedRating = 0;
                const existingRatingEl = ratingSection.querySelector('.existing-rating');
                if (existingRatingEl) {
                    existingRatingEl.classList.add('d-none');
                }
                
                const ratingStarsEl = ratingSection.querySelector('.rating-stars');
                const rateButton = ratingSection.querySelector('.rate-transaction-btn');
                
                if (ratingStarsEl && rateButton) {
                    ratingStarsEl.style.display = 'block';
                    rateButton.style.display = 'block';
                    
                    // Reset star highlighting
                    const stars = ratingStarsEl.querySelectorAll('.fa-star');
                    this.highlightStars(stars, 0);
                }
            });
        }

        // Handle edit rating button
        const editRatingBtn = document.getElementById('editRatingBtn');
        if (editRatingBtn) {
            editRatingBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showRatingModal(transactionId);
            });
        }
    }

    /**
     * Highlight stars up to the given rating
     * @param {NodeList} stars - The star elements
     * @param {number} rating - The rating to highlight up to
     */
    highlightStars(stars, rating) {
        if (!stars || !stars.length) {
            console.warn('No stars found to highlight');
            return;
        }
        
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.remove('far');
                star.classList.add('fas');
            } else {
                star.classList.remove('fas');
                star.classList.add('far');
            }
        });
    }

    /**
     * Show the rating modal
     * @param {number} transactionId - The ID of the transaction to rate
     * @param {number} [initialRating=0] - The initial rating to pre-select
     */
    showRatingModal(transactionId, initialRating = 0) {
        // Use the global ratingModal if available, otherwise fall back to a simple prompt
        if (window.ratingModal) {
            window.ratingModal.show(transactionId);
        } else {
            this.showRatingPrompt(transactionId, initialRating);
        }
    }

    /**
     * Fallback method to show a simple rating prompt if the modal isn't available
     * @param {number} transactionId - The ID of the transaction to rate
     * @param {number} initialRating - The initial rating to pre-select
     */
    async showRatingPrompt(transactionId, initialRating = 0) {
        // This is a simplified fallback - in a real app, you'd want to use the modal
        const rating = prompt('Please rate this transaction (1-5 stars):', initialRating || '');
        
        if (rating === null) return; // User cancelled
        
        const score = parseInt(rating);
        if (isNaN(score) || score < 1 || score > 5) {
            this.showError('Please enter a valid rating between 1 and 5');
            return;
        }
        
        const comment = prompt('(Optional) Add a comment about your experience:');
        
        try {
            const ratingService = window.ratingService;
            if (!ratingService) throw new Error('Rating service not available');
            
            await ratingService.rateTransaction(transactionId, { 
                score, 
                comment: comment || '' 
            });
            
            this.showSuccess('Thank you for your rating!');
            
            // Refresh the transaction details to show the updated rating
            if (this.currentTransaction && this.currentTransaction.id === transactionId) {
                this.showTransactionDetails(transactionId);
            }

        } catch (error) {
            console.error('Error submitting rating:', error);
            this.showError(error.message || 'Failed to submit rating');
        }
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
                    ? otherParty + ' wants to buy this item'
                    : 'You requested to buy from ' + otherParty,
                'SELL': isIncoming
                    ? otherParty + ' wants to sell you an item'
                    : 'You offered to sell to ' + otherParty,
                'SWAP': isIncoming
                    ? otherParty + ' wants to swap items with you'
                    : 'You requested to swap with ' + otherParty,
                'DONATION': isIncoming
                    ? otherParty + ' requested this item as a donation'
                    : 'You requested this item as a donation',
                'REQUEST': isIncoming
                    ? otherParty + ' sent you an item request'
                    : 'You sent an item request to ' + otherParty
            };
            
            return descriptions[transactionType] || 'New transaction';
        } catch (error) {
            console.error('Error generating transaction description:', error);
            return 'New transaction';
        }
    }


    // Load and update both received and sent transaction counts
    async loadAndUpdateCounts() {
        try {
            // Fetch both received and sent transactions
            const [receivedResponse, sentResponse] = await Promise.all([
                fetch(this.baseUrl + '/received', {
                    method: 'GET',
                    headers: this.getAuthHeaders(),
                    credentials: 'include'
                }),
                fetch(this.baseUrl + '/sent', {
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

    // Get empty state HTML
    getEmptyState(message, icon) {
        // Default to 'inbox' if icon is not provided
        icon = icon || 'inbox';
        return [
            '<div class="empty-state">',
            '    <i class="fas fa-' + icon + ' fa-3x mb-3"></i>',
            '    <p class="text-muted">' + (message || '') + '</p>',
            '</div>'
        ].join('\n');
    }

    // Update transaction counts in the UI
    updateCounts(counts) {
        const receivedBadge = document.getElementById('receivedCount');
        const sentBadge = document.getElementById('sentCount');
        
        if (receivedBadge) receivedBadge.textContent = counts.received || 0;
        if (sentBadge) sentBadge.textContent = counts.sent || 0;
    }
}

// The initialization is now handled by transactions.html
// This file just contains the TransactionManager class definition

// Helper function to show initialization error
function showInitializationError(message) {
    console.error('Initialization Error:', message);
    const errorDiv = document.getElementById('initializationError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    } else {
        // Fallback in case the error div doesn't exist
        alert('Initialization Error: ' + message);
    }
}

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

