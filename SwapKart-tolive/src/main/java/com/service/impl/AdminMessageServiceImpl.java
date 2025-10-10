package com.service.impl;

import com.dto.ConversationDto;
import com.dto.MessageDto;
import com.entity.Message;
import com.model.Conversation;
import com.entity.User;
import com.repository.ConversationRepository;
import com.repository.CustomMessageRepository;
import com.repository.UserRepository;
import com.service.AdminMessageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class AdminMessageServiceImpl implements AdminMessageService {

    private final CustomMessageRepository messageRepository;
    private final UserRepository userRepository;
    private final ConversationRepository conversationRepository;

    @Autowired
    public AdminMessageServiceImpl(
            CustomMessageRepository messageRepository,
            UserRepository userRepository,
            ConversationRepository conversationRepository) {
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.conversationRepository = conversationRepository;
    }

    @Override
    public List<ConversationDto> getAllConversations() {
        // Get the last 50 conversations with their latest message
        Pageable pageable = PageRequest.of(0, 50, Sort.by(Sort.Direction.DESC, "lastMessageTime"));
        Page<Conversation> conversations = conversationRepository.findAllOrderByLastMessageTimeDesc(pageable);
        
        return conversations.getContent().stream()
                .map(this::convertToConversationDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<MessageDto> getMessages(String chatId) {
        // Get messages for a specific conversation, ordered by timestamp
        List<Message> messages = messageRepository.findByChatRoomIdOrderByCreatedAtAsc(Long.parseLong(chatId));
        return messages.stream()
                .map(this::convertToMessageDto)
                .collect(Collectors.toList());
    }

    @Override
    public void markMessagesAsRead(String chatId) {
        messageRepository.markMessagesAsRead(Long.parseLong(chatId), getCurrentUserId());
    }

    @Override
    public MessageDto sendMessage(MessageDto messageDto) {
        // Get or create conversation
        Conversation conversation = conversationRepository.findById(messageDto.getChatId())
                .orElseGet(() -> createNewConversation(messageDto));

        // Fetch the User entity
        User sender = userRepository.findById(getCurrentUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Create and save message
        Message message = new Message();
        message.setContent(messageDto.getContent());
        message.setChatRoom(conversation.getChatRoom()); // Make sure to set the ChatRoom
        message.setSender(sender);  // Now passing a User object, not a Long
        message.setCreatedAt(LocalDateTime.now());
        message = messageRepository.save(message);

        // Update conversation's last message time
        conversation.setLastMessageTime(message.getCreatedAt());
        conversationRepository.save(conversation);

        return convertToMessageDto(message);
    }

    private Conversation createNewConversation(MessageDto messageDto) {
        // Create a new conversation
        Conversation conversation = new Conversation();
        conversation.setId(String.valueOf(messageDto.getChatId()));
        // Assuming recipientId is the other participant's ID
        Long recipientId = messageDto.getChatId() != null ?
            messageDto.getChatId() : getCurrentUserId();
        conversation.setParticipantId(recipientId);
        conversation.setParticipantName(getParticipantName(recipientId));
        conversation.setLastMessageTime(LocalDateTime.now());
        return conversationRepository.save(conversation);
    }

    private String getParticipantName(Long userId) {
        if (userId == null) {
            return "Unknown User";
        }
        // Get participant's name from user repository
        return userRepository.findById(userId)
                .map(User::getName)
                .orElse("Unknown User");
    }

    private Long getCurrentUserId() {
        // Get current authenticated user's ID
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new SecurityException("User not authenticated");
        }
        String username = authentication.getName();
        return userRepository.findByEmail(username)
                .map(User::getId)
                .orElseThrow(() -> new SecurityException("User not found"));
    }

    private ConversationDto convertToConversationDto(Conversation conversation) {
        ConversationDto dto = new ConversationDto();
        dto.setChatId(Long.valueOf(conversation.getId()));
        dto.setOtherUserName(conversation.getParticipantName());
        // Set a default avatar or get from user profile if available
        dto.setOtherUserAvatar("/images/default-avatar.png");
        dto.setLastMessage(conversation.getLastMessage());
        dto.setLastMessageTime(conversation.getLastMessageTime());
        dto.setUnread(messageRepository.countByChatRoomIdAndReadFalse(Long.parseLong(conversation.getId())) > 0);
        return dto;
    }

    private MessageDto convertToMessageDto(Message message) {
        MessageDto dto = new MessageDto();
        dto.setId(message.getId());
        dto.setContent(message.getContent());
        dto.setChatId(Long.valueOf(message.getChatRoom().getId()));
        dto.setSenderId(message.getSender().getId());
        dto.setTimestamp(message.getCreatedAt());
        dto.setRead(message.isRead());
        // Set sender name if available
        if (message.getSender() != null) {
            dto.setSenderName(userRepository.findById(message.getSender().getId())
                .map(User::getName)
                .orElse("Unknown User"));
        }
        return dto;
    }
}
