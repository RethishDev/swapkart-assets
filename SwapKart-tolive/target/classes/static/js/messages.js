// Messages Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const conversationsList = document.getElementById('conversationsList');
    const messagesContainer = document.getElementById('messagesContainer');
    const messageInput = document.getElementById('messageInput');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    const chatPartnerName = document.getElementById('chatPartnerName');
    const chatPartnerAvatar = document.getElementById('chatPartnerAvatar');
    const messageInputContainer = document.querySelector('.message-input-container');
    
    // WebSocket connection
    let currentChatId = null;
    let currentUserId = null;
    
    // Initialize the page
    async function init() {
        // Only initialize if we're on the messages page
        if (!window.location.pathname.includes('messages')) {
            return;
        }
        
        // Get current user ID from localStorage or session
        currentUserId = localStorage.getItem('userId');
        
        if (!currentUserId) {
            // Redirect to login if not authenticated
            window.location.href = '/login';
            return;
        }
        
        try {
            // Load user's conversations
            await loadConversations();
            
            // Set up event listeners
            setupEventListeners();
        } catch (error) {
            console.error('Error initializing messages:', error);
            showError('Failed to initialize messages. Please refresh the page.');
        }
    }
    
    // Load user's conversations
    async function loadConversations() {
        try {
            const response = await fetch('/api/chat/conversations', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to load conversations');
            }
            
            const conversations = await response.json();
            renderConversations(conversations);
            
        } catch (error) {
            console.error('Error loading conversations:', error);
            showError('Failed to load conversations');
        }
    }
    
    // Render conversations list
    function renderConversations(conversations) {
        if (!conversations || conversations.length === 0) {
            conversationsList.innerHTML = `
                <div class="conversation-placeholder">
                    <i class="fas fa-comments"></i>
                    <p>No conversations yet</p>
                </div>
            `;
            return;
        }
        
        conversationsList.innerHTML = conversations.map(conv => `
            <div class="conversation" data-chat-id="${conv.chatId}" data-user-id="${conv.otherUserId}">
                <img src="${conv.avatar || '/images/default-avatar.svg'}" alt="${conv.otherUserName}" class="conversation-avatar">
                <div class="conversation-info">
                    <div class="conversation-name">${conv.otherUserName}</div>
                    <div class="conversation-preview">${conv.lastMessage || ''}</div>
                </div>
                <div class="conversation-time">${formatTime(conv.lastMessageTime)}</div>
            </div>
        `).join('');
        
        // Add click handlers to conversations
        document.querySelectorAll('.conversation').forEach(conv => {
            conv.addEventListener('click', () => loadChat(
                conv.dataset.chatId, 
                conv.dataset.userId,
                conv.querySelector('.conversation-name').textContent,
                conv.querySelector('.conversation-avatar').src
            ));
        });
    }
    
    // Load chat messages
    async function loadChat(chatId, userId, userName, userAvatar) {
        try {
            currentChatId = chatId;
            chatPartnerName.textContent = userName;
            chatPartnerAvatar.src = userAvatar;

            // Mark as active in the sidebar
            document.querySelectorAll('.conversation').forEach(conv => {
                conv.classList.toggle('active', conv.dataset.chatId === chatId);
            });

            // Show message input
            messageInputContainer.style.display = 'block';

            // Clear previous messages
            messagesContainer.innerHTML = '';

            // Load messages
            const response = await fetch(`/api/chat/${chatId}/messages`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load messages');
            }

            const messages = await response.json();
            renderMessages(messages);

            // Subscribe to chat updates
            subscribeToChat(chatId);

            // Scroll to bottom
            scrollToBottom();

        } catch (error) {
            console.error('Error loading chat:', error);
            showError('Failed to load chat');
        }
    }
    
    // Render messages
    function renderMessages(messages) {
        if (!messages || messages.length === 0) {
            messagesContainer.innerHTML = `
                <div class="no-messages">
                    <i class="fas fa-comment-alt"></i>
                    <p>No messages yet. Start the conversation!</p>
                </div>
            `;
            return;
        }
        
        messagesContainer.innerHTML = messages.map(msg => `
            <div class="message ${String(msg.senderId) === String(currentUserId) ? 'message-sent' : 'message-received'}">
                <div class="message-content">${msg.content}</div>
                <div class="message-time">${formatTime(msg.timestamp)}</div>
            </div>
        `).join('');

    }
    
    // Send message
    async function sendMessage() {
        const content = messageInput.value.trim();
        if (!content || !currentChatId) return;

        // Create a temporary message object for immediate UI update
        const tempMessage = {
            id: 'temp-' + Date.now(),
            content: content,
            senderId: currentUserId,
            timestamp: new Date().toISOString(),
            status: 'sending'
        };

        // Add message to UI immediately
        handleIncomingMessage(tempMessage);

        try {
            const response = await fetch(`/api/chat/${currentChatId}/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ content })
            });

            if (!response.ok) {
                throw new Error('Failed to send message');
            }

            // Clear input
            messageInput.value = '';

            // After 2 seconds, update the message status to "sent"
            setTimeout(() => {
                const messageElement = document.querySelector(`[data-message-id="${tempMessage.id}"]`);
                if (messageElement) {
                    // Remove sending class
                    messageElement.classList.remove('message-sending');
                    
                    // Update status to sent
                    const statusElement = messageElement.querySelector('.message-status');

                    // Play send sound when message is sent
                    playMessageSound();

                    if (statusElement) {
                        statusElement.innerHTML = '<i class="fas fa-check"></i> Sent';
                    } else {
                        // If no status element exists, create one
                        const messageTime = messageElement.querySelector('.message-time');
                        if (messageTime) {
                            const newStatusElement = document.createElement('div');
                            newStatusElement.className = 'message-status';
                            newStatusElement.innerHTML = '<i class="fas fa-check"></i> Sent';
                            messageTime.insertAdjacentElement('afterend', newStatusElement);
                        }
                    }
                }
            }, 2000);

        } catch (error) {
            console.error('Error sending message:', error);
            showError('Failed to send message. Please try again.');

            // Update the message status to show it failed to send
            const messageElement = document.querySelector(`[data-message-id="${tempMessage.id}"]`);
            if (messageElement) {
                messageElement.classList.add('message-failed');
                const statusElement = messageElement.querySelector('.message-status');
                if (statusElement) {
                    statusElement.innerHTML = '<i class="fas fa-exclamation-circle"></i> Failed to send';
                }
            }
        }
    }
    
    function handleIncomingMessage(message) {
        // Check if this is an update to a temporary message
        if (message.tempId) {
            const tempElement = document.querySelector(`[data-message-id="${message.tempId}"]`);
            if (tempElement) {
                // Replace the temporary message with the actual one
                const newMessageElement = createMessageElement(message, String(message.senderId) === String(currentUserId));
                tempElement.replaceWith(newMessageElement);
                scrollToBottom();
                return;
            }
        }
        
        // Check if message already exists to prevent duplicates
        const existingMessage = document.querySelector(`[data-message-id="${message.id}"]`);
        if (existingMessage) {
            // Message already exists, don't add it again
            return;
        }
        
        // Add the new message to the UI
        const messageElement = createMessageElement(message, String(message.senderId) === String(currentUserId));
        messagesContainer.appendChild(messageElement);
        scrollToBottom();
        
        // Update the conversation list to show the new message (only for WebSocket messages)
        if (message.chatId) {
            updateConversationInList(message);
        }
    }
    
    function createMessageElement(message, isSent) {
      const messageDiv = document.createElement('div');
      messageDiv.className = `message ${isSent ? 'message-sent' : 'message-received'}`;
      
      // Add message ID for tracking
      if (message.id) {
          messageDiv.setAttribute('data-message-id', message.id);
      }
      
      // Add status class if message is still sending
      if (message.status === 'sending') {
          messageDiv.classList.add('message-sending');
      }
      
      messageDiv.innerHTML = `
          <div class="message-content">${message.content}</div>
          <div class="message-time">${formatTime(message.timestamp)}</div>
          ${message.status === 'sending' ? '<div class="message-status"><i class="fas fa-clock"></i> Sending...</div>' : ''}
      `;
      return messageDiv;
    }

    
    function updateConversationInList(message) {
        // Find the conversation in the list
        const conversation = document.querySelector(`.conversation[data-chat-id="${message.chatId}"]`);
        
        if (conversation) {
            // Update the preview and time
            const preview = conversation.querySelector('.conversation-preview');
            const time = conversation.querySelector('.conversation-time');
            
            preview.textContent = message.content.length > 30 
                ? message.content.substring(0, 30) + '...' 
                : message.content;
                
            time.textContent = formatTime(message.timestamp);
            
            // Move to top of the list
            conversationsList.insertBefore(conversation, conversationsList.firstChild);
        } else {
            // If this is a new conversation, reload the list
            loadConversations();
        }
    }
    
    // Helper functions
    function formatTime(timestamp) {
        if (!timestamp) return '';
        
        const date = new Date(timestamp);
        const now = new Date();
        
        // If today, show time
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        
        // If yesterday, show 'Yesterday'
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        }
        
        // Otherwise, show date
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    
    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    function playMessageSound() {
        try {
            // Create an audio context for playing a simple notification sound
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Configure the sound (a pleasant "pop" sound)
            oscillator.frequency.value = 800; // Frequency in Hz
            oscillator.type = 'sine'; // Sine wave for a smooth sound

//            // 1. Another oscillator for a different sound
//            oscillator1.frequency.value = 1200; // Very high pitch
//            oscillator1.type = 'square'; // Sharper sound

//            // 2. Another oscillator for a different sound
//            oscillator1.frequency.value = 1000; // Higher, clearer sound
//            oscillator1.type = 'sine';

//            // 3. Another oscillator for a different sound
//            oscillator1.frequency.value = 400; // Lower, deeper sound
//            oscillator1.type = 'triangle'; // Different wave type
            
            // Set volume (0.0 to 1.0)
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            // Play the sound
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (error) {
            console.log('Could not play sound:', error);
            // Silently fail if audio is not supported
        }
    }
    
    function showError(message) {
        // You can implement a better error notification system
        console.error(message);
        alert(message);
    }
    
    // Set up event listeners
    function setupEventListeners() {
        // Send message on button click
        sendMessageBtn.addEventListener('click', sendMessage);
        
        // Send message on Enter key
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        // Handle window resize for responsive design
        window.addEventListener('resize', function() {
            if (window.innerWidth <= 768) {
                // Adjust layout for mobile
            } else {
                // Adjust layout for desktop
            }
        });
    }
    
    // Initialize the app
    init();

   let stompClient = null;

   function connectWebSocket() {
       const socket = new SockJS('/ws');
       stompClient = Stomp.over(socket);

       stompClient.connect(
           { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
           function(frame) {
               console.log('Connected to WebSocket');

               // Subscribe to user's private queue
               stompClient.subscribe(`/user/queue/messages`, function(message) {
                   const msg = JSON.parse(message.body);
                   console.log('New message received:', msg);

                   // Update UI with the new message
                   if (msg.chatId === currentChatId) {
                       handleIncomingMessage(msg);
                   }

                   // Update conversation list
                   updateConversationInList(msg);
               });

               // Subscribe to the current chat if one is loaded
               if (currentChatId) {
                   subscribeToChat(currentChatId);
               }
           },
           function(error) {
               console.error('WebSocket error:', error);
               // Attempt to reconnect after 5 seconds
               setTimeout(connectWebSocket, 5000);
           }
       );
   }
   
   // Start WebSocket connection
   connectWebSocket();
   
   // Function to subscribe to a specific chat
   function subscribeToChat(chatId) {
       if (stompClient && stompClient.connected) {
           // Unsubscribe from previous chat if any
           if (currentChatId) {
               stompClient.unsubscribe(`/topic/chat/${currentChatId}`);
           }
           
           // Subscribe to new chat
           stompClient.subscribe(`/topic/chat/${chatId}`, function(message) {
               const msg = JSON.parse(message.body);
               console.log('New chat message:', msg);
               handleIncomingMessage(msg);
           });
           
           currentChatId = chatId;
       }
   }

});
