// Global variables
let stompClient = null;
let currentUser = null;
let currentChatId = null;
let isTyping = false;
let typingTimeout = null;
const API_BASE_URL = '/api/admin/messages';
const WS_ENDPOINT = '/ws';
const WS_TOPIC_PREFIX = '/topic';
const WS_APP_PREFIX = '/app';

// DOM Elements
const conversationsList = document.getElementById('conversationsList');
const messageContainer = document.getElementById('messageContainer');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const conversationHeader = document.getElementById('conversationHeader');
const messageFormContainer = document.getElementById('messageFormContainer');
const searchInput = document.getElementById('searchConversations');
const refreshBtn = document.getElementById('refreshBtn');

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Load current user and conversations
    loadCurrentUser();
    loadConversations();
    
    // Setup event listeners
    messageForm?.addEventListener('submit', handleSubmit);
    messageInput?.addEventListener('input', handleTyping);
    searchInput?.addEventListener('input', filterConversations);
    refreshBtn?.addEventListener('click', loadConversations);
    
    // Initialize WebSocket connection
    connectWebSocket();
});

// Load current user details
async function loadCurrentUser() {
    try {
        const response = await fetch('/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            currentUser = await response.json();
        } else {
            throw new Error('Failed to load user data');
        }
    } catch (error) {
        console.error('Error loading user:', error);
        showToast('Failed to load user data', 'error');
    }
}

// Load conversations list
async function loadConversations() {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/conversations`);
        const conversations = await response.json();
        renderConversations(conversations);
    } catch (error) {
        console.error('Error loading conversations:', error);
        showToast('Failed to load conversations', 'error');
    }
}

// Render conversations list
function renderConversations(conversations) {
    if (!conversationsList) return;
    
    if (conversations.length === 0) {
        conversationsList.innerHTML = `
            <div class="text-center p-4 text-muted">
                <i class="fas fa-inbox fa-3x mb-3"></i>
                <p>No conversations found</p>
            </div>
        `;
        return;
    }
    
    conversationsList.innerHTML = conversations.map(conv => `
        <a href="#" class="list-group-item list-group-item-action conversation-item ${currentChatId === conv.chatId ? 'active' : ''}" 
           data-chat-id="${conv.chatId}" data-participant-id="${conv.participantId}">
            <div class="d-flex w-100 justify-content-between">
                <h6 class="mb-1">${escapeHtml(conv.participantName)}</h6>
                <small>${formatTime(conv.lastMessageTime)}</small>
            </div>
            <p class="mb-1 text-truncate">${escapeHtml(conv.lastMessage || 'No messages yet')}</p>
        </a>
    `).join('');
    
    // Add click event listeners to conversation items
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const chatId = item.dataset.chatId;
            const participantId = item.dataset.participantId;
            const participantName = item.querySelector('h6').textContent;
            loadConversation(chatId, participantId, participantName);
        });
    });
}

// Load a specific conversation
async function loadConversation(chatId, participantId, participantName) {
    try {
        currentChatId = chatId;
        
        // Update UI
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.toggle('active', item.dataset.chatId === chatId);
        });
        
        conversationHeader.innerHTML = `
            <div class="d-flex align-items-center">
                <div class="me-3">
                    <i class="fas fa-user-circle fa-2x"></i>
                </div>
                <div>
                    <h5 class="mb-0">${escapeHtml(participantName)}</h5>
                    <small class="text-muted">Chat ID: ${chatId}</small>
                </div>
            </div>
        `;
        
        // Show message form
        messageFormContainer.classList.remove('d-none');
        
        // Load messages
        const response = await fetchWithAuth(`${API_BASE_URL}/${chatId}/messages`);
        const messages = await response.json();
        renderMessages(messages);
        
        // Mark messages as read
        await fetchWithAuth(`${API_BASE_URL}/${chatId}/read`, { method: 'POST' });
        
    } catch (error) {
        console.error('Error loading conversation:', error);
        showToast('Failed to load conversation', 'error');
    }
}

// Render messages
function renderMessages(messages) {
    if (!messageContainer) return;
    
    if (messages.length === 0) {
        messageContainer.innerHTML = `
            <div class="text-center p-5 text-muted">
                <i class="fas fa-comment-slash fa-3x mb-3"></i>
                <p>No messages yet. Start the conversation!</p>
            </div>
        `;
        return;
    }
    
    messageContainer.innerHTML = messages.map(msg => {
        const isSent = msg.senderId === currentUser?.id;
        return `
            <div class="message p-3 ${isSent ? 'message-sent' : 'message-received'}">
                <div class="message-content">${escapeHtml(msg.content)}</div>
                <div class="message-time">${formatTime(msg.timestamp)}</div>
            </div>
        `;
    }).join('');
    
    // Scroll to bottom
    messageContainer.scrollTop = messageContainer.scrollHeight;
}

// Handle message submission
async function handleSubmit(e) {
    e.preventDefault();
    
    const messageContent = messageInput.value.trim();
    if (!messageContent || !currentChatId) return;
    
    try {
        const message = {
            content: messageContent,
            chatId: currentChatId,
            senderId: currentUser.id,
            timestamp: new Date().toISOString()
        };
        
        // Send via WebSocket for real-time delivery
        if (stompClient && stompClient.connected) {
            stompClient.send(
                `${WS_APP_PREFIX}/chat/${currentChatId}/sendMessage`,
                {},
                JSON.stringify(message)
            );
        } else {
            // Fallback to REST API if WebSocket is not available
            await fetchWithAuth(API_BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(message)
            });
        }
        
        // Clear input and reset typing indicator
        messageInput.value = '';
        isTyping = false;
        
        // Auto-scroll to bottom
        scrollToBottom();
        
    } catch (error) {
        console.error('Error sending message:', error);
        showToast('Failed to send message', 'error');
    }
}

// Handle typing indicator
function handleTyping() {
    if (!stompClient || !stompClient.connected || !currentChatId) return;
    
    // Only send typing notification if user wasn't already typing
    if (!isTyping) {
        stompClient.send(
            `${WS_APP_PREFIX}/chat/${currentChatId}/typing`,
            {},
            JSON.stringify({ userId: currentUser?.id, username: currentUser?.username })
        );
        isTyping = true;
    }
    
    // Reset typing status after 2 seconds of inactivity
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        isTyping = false;
    }, 2000);
}

// Show typing indicator
function showTypingIndicator(typingData) {
    if (!typingData || !typingData.username) return;
    
    const typingIndicator = document.getElementById('typingIndicator');
    if (!typingIndicator) return;
    
    typingIndicator.textContent = `${typingData.username} is typing...`;
    typingIndicator.style.display = 'block';
    
    // Hide after 3 seconds
    setTimeout(() => {
        typingIndicator.style.display = 'none';
    }, 3000);
}

// Scroll to bottom of message container
function scrollToBottom() {
    const container = document.getElementById('messageContainer');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

// WebSocket connection
function connectWebSocket() {
    const socket = new SockJS(WS_ENDPOINT);
    stompClient = Stomp.over(socket);
    
    const headers = {
        'X-CSRF-TOKEN': document.querySelector('meta[name="_csrf"]')?.content || ''
    };
    
    stompClient.connect(headers, function(frame) {
        console.log('Connected to WebSocket');
        
        // Subscribe to user's private queue
        if (currentUser?.id) {
            // Private messages
            stompClient.subscribe(`/user/queue/messages`, function(message) {
                const newMessage = JSON.parse(message.body);
                handleNewMessage(newMessage);
            });
            
            // Conversation updates
            stompClient.subscribe(`/user/queue/conversations`, function() {
                loadConversations();
            });
        }
        
        // Subscribe to admin broadcast
        stompClient.subscribe(`${WS_TOPIC_PREFIX}/admin/messages`, function(message) {
            const newMessage = JSON.parse(message.body);
            handleNewMessage(newMessage);
        });
        
        // Subscribe to typing notifications
        if (currentChatId) {
            stompClient.subscribe(`${WS_TOPIC_PREFIX}/chat/${currentChatId}/typing`, function(typingData) {
                showTypingIndicator(JSON.parse(typingData.body));
            });
        }
        
    }, function(error) {
        console.error('WebSocket connection error:', error);
        showToast('Connection lost. Reconnecting...', 'warning');
        // Attempt to reconnect after 5 seconds
        setTimeout(connectWebSocket, 5000);
    });
}

// Handle incoming messages
function handleNewMessage(message) {
    if (!message) return;
    
    // If message is for the current chat, add it to the view
    if (message.chatId === currentChatId) {
        // Add to current conversation
        const messages = [{ 
            ...message, 
            senderId: message.senderId,
            content: message.content,
            timestamp: message.timestamp || new Date().toISOString(),
            read: message.senderId === currentUser?.id ? true : message.read
        }];
        
        renderMessages(messages);
        
        // Mark as read if it's a received message
        if (message.senderId !== currentUser?.id && !message.read) {
            markMessagesAsRead(message.chatId);
        }
    }
    
    // Update conversations list to show unread count
    updateConversationInList(message);
    
    // Play notification sound for new messages
    if (message.senderId !== currentUser?.id) {
        playNotificationSound();
    }
}

// Mark messages as read
async function markMessagesAsRead(chatId) {
    try {
        await fetchWithAuth(`${API_BASE_URL}/${chatId}/read`, {
            method: 'POST'
        });
        
        // Update UI to show messages as read
        document.querySelectorAll('.message.unread').forEach(el => {
            el.classList.remove('unread');
        });
        
    } catch (error) {
        console.error('Error marking messages as read:', error);
    }
}

// Play notification sound
function playNotificationSound() {
    const audio = new Audio('/sounds/notification.mp3');
    audio.play().catch(e => console.log('Audio play failed:', e));
}

// Update conversation in the sidebar
function updateConversationInList(message) {
    const conversationElement = document.querySelector(`.conversation-item[data-chat-id="${message.chatId}"]`);
    if (conversationElement) {
        // Update last message preview
        const previewElement = conversationElement.querySelector('.conversation-preview');
        if (previewElement) {
            previewElement.textContent = message.content.length > 30 
                ? message.content.substring(0, 30) + '...' 
                : message.content;
        }
        
        // Update timestamp
        const timeElement = conversationElement.querySelector('.conversation-time');
        if (timeElement) {
            timeElement.textContent = formatTime(message.timestamp);
        }
        
        // Update unread badge if it's a new message
        if (message.senderId !== currentUser?.id && !message.read) {
            let badge = conversationElement.querySelector('.unread-badge');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'unread-badge badge bg-primary rounded-pill ms-2';
                conversationElement.querySelector('.conversation-header').appendChild(badge);
            }
            const count = parseInt(badge.textContent || '0') + 1;
            badge.textContent = count;
            badge.style.display = 'inline-block';
        }
    }
}

// Helper function for authenticated requests
async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        throw new Error('Not authenticated');
    }
    
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers
        }
    });
    
    if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('token');
        window.location.href = '/login.html';
        throw new Error('Session expired');
    }
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Request failed');
    }
    
    return response;
}

// Filter conversations based on search input
function filterConversations() {
    const searchTerm = searchInput.value.toLowerCase();
    const items = document.querySelectorAll('.conversation-item');
    
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(searchTerm) ? 'block' : 'none';
    });
}

// Helper function to format time
function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Helper function to escape HTML
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');
    
    if (!toast || !toastTitle || !toastMessage) return;
    
    toastTitle.textContent = type.charAt(0).toUpperCase() + type.slice(1);
    toastMessage.textContent = message;
    
    // Set toast color based on type
    toast.className = `toast ${type}`;
    
    // Show the toast
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}

// Handle logout
function handleLogout() {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
}

// Make functions available globally
window.handleLogout = handleLogout;
