package com.service;

import com.dto.*;
import com.entity.*;
import com.exception.ResourceNotFoundException;
import com.repository.ChatRoomRepository;
import com.repository.ItemRepository;
import com.repository.MessageRepository;
import com.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ChatService {

    private final MessageRepository messageRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final ItemRepository itemRepository;

    @Autowired
    public ChatService(MessageRepository messageRepository,
    ChatRoomRepository chatRoomRepository,
    UserRepository userRepository,
    SimpMessagingTemplate messagingTemplate,
    ItemRepository itemRepository) {
        this.messageRepository = messageRepository;
        this.chatRoomRepository = chatRoomRepository;
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
        this.itemRepository = itemRepository;
    }

    @Transactional(readOnly = true)
    public ChatRoomDto getChatRoom(Long roomId, Long userId) {
        ChatRoom chatRoom = chatRoomRepository.findById(roomId)
                .filter(room -> room.getParticipants().stream()
                        .anyMatch(participant -> participant.getId().equals(userId)))
                .orElseThrow(() -> new ResourceNotFoundException("Chat room not found or access denied"));

        return convertToChatRoomDto(chatRoom);
    }


    @Transactional
    public ChatRoomDto getOrCreateChatRoom(Long userId1, Long userId2, Long itemId) {
        ChatRoom chatRoom = chatRoomRepository.findChatRoomByParticipantsAndItem(userId1, userId2, itemId)
                .orElseGet(() -> createNewChatRoom(userId1, userId2, itemId));
        return convertToChatRoomDto(chatRoom);
    }


    private ChatRoom createNewChatRoom(Long userId1, Long userId2, Long itemId) {
        User user1 = userRepository.findById(userId1)
            .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId1));

        User user2 = userRepository.findById(userId2)
            .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId2));

        ChatRoom chatRoom = new ChatRoom();
        chatRoom.setName("Chat: " + user1.getName() + " and " + user2.getName());
        chatRoom.addParticipant(user1);
        chatRoom.addParticipant(user2);

        // If itemId is provided, associate it with the chat
        if (itemId != null) {
            Item item = itemRepository.findById(itemId)
                    .orElseThrow(() -> new ResourceNotFoundException("Item not found with id: " + itemId));
            chatRoom.setItem(item);
        }

        return chatRoomRepository.save(chatRoom);
    }

    @Transactional
    public MessageDto sendMessage(ChatMessageDto messageDto) {
        ChatRoom chatRoom = chatRoomRepository.findById(messageDto.getChatRoomId())
                .orElseThrow(() -> new ResourceNotFoundException("Chat room not found"));

        User sender = userRepository.findById(messageDto.getSenderId())
                .orElseThrow(() -> new ResourceNotFoundException("Sender not found"));

        Message message = Message.builder()
                .chatRoom(chatRoom)
                .sender(sender)
                .content(messageDto.getContent())
                .type(Message.MessageType.TEXT)
                .createdAt(LocalDateTime.now())
                .build();

        Message savedMessage = messageRepository.save(message);

        // Notify participants
        notifyChatRoomParticipants(chatRoom, savedMessage);

        return convertToDto(savedMessage);
    }


    private void notifyChatRoomParticipants(ChatRoom chatRoom, Message message) {
        MessageDto dto = convertToDto(message);
        chatRoom.getParticipants().forEach(participant -> {
            if (!participant.getId().equals(message.getSender().getId())) {
                String destination = "/queue/messages/" + participant.getId();
                messagingTemplate.convertAndSend(destination, dto);
            }
        });
    }


    @Transactional(readOnly = true)
    public List<MessageDto> getChatHistory(Long chatRoomId, Long userId) {
        if (!chatRoomRepository.existsByIdAndParticipant(chatRoomId, userId)) {
            throw new SecurityException("Access denied to chat room");
        }

        return messageRepository.findByChatRoomIdOrderByCreatedAt(chatRoomId)
                .stream()
                .map(this::convertToDto)
                .toList();
    }


    @Transactional(readOnly = true)
    public List<ChatRoomDto> getUserChatRooms(Long userId) {
        return chatRoomRepository.findActiveChatRoomsByUserId(userId)
                .stream()
                .map(this::convertToChatRoomDto)
                .toList();
    }


    @Transactional
    public void markMessagesAsRead(Long chatRoomId, Long userId) {
        messageRepository.markMessagesAsRead(chatRoomId, userId);
    }
    
    @Transactional(readOnly = true)
    public List<ConversationDto> getUserConversations(Long userId) {
        List<Object[]> results = messageRepository.findUserConversations(userId);
        return results.stream().map(result -> {
            ConversationDto dto = new ConversationDto();
            dto.setId((Long) result[0]);
            dto.setChatId((Long) result[1]);
            dto.setOtherUserName((String) result[2]);
            dto.setOtherUserAvatar((String) result[3]);
            dto.setLastMessage((String) result[4]);
            dto.setLastMessageTime((LocalDateTime) result[5]);
            dto.setUnread((Boolean) result[6]);
            return dto;
        }).toList();
    }


    @Transactional(readOnly = true)
    public List<MessageDto> getChatMessages(Long chatId, Long userId) {
        // Verify user has access to this chat
        if (!chatRoomRepository.existsByIdAndParticipant(chatId, userId)) {
            throw new SecurityException("Access denied to chat room");
        }
        
        return messageRepository.findByChatRoomId(chatId).stream()
            .map(this::convertToDto)
            .toList();
    }
    
    @Transactional
    public MessageDto saveMessage(MessageDto messageDto) {
        ChatRoom chatRoom = chatRoomRepository.findById(messageDto.getChatId())
            .orElseThrow(() -> new ResourceNotFoundException("Chat room not found"));
            
        User sender = userRepository.findById(messageDto.getSenderId())
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
            
        Message message = new Message();
        message.setChatRoom(chatRoom);
        message.setSender(sender);
        message.setContent(messageDto.getContent());
        message.setType(Message.MessageType.TEXT);
        message.setCreatedAt(LocalDateTime.now());
        message.setRead(false);
        
        Message savedMessage = messageRepository.save(message);
        
        // Notify participants
        notifyChatRoomParticipants(chatRoom, savedMessage);
        
        return convertToDto(savedMessage);
    }

    private MessageDto convertToDto(Message message) {
        MessageDto dto = new MessageDto();
        dto.setId(message.getId());
        dto.setChatId(message.getChatRoom().getId());
        dto.setSenderId(message.getSender().getId());
        dto.setSenderName(message.getSender().getName()); // User.name
        dto.setContent(message.getContent());
        dto.setTimestamp(message.getCreatedAt());
        dto.setRead(message.isRead());
        return dto;
    }

    @Transactional
    public void deleteConversation(Long chatId, Long userId) {
        ChatRoom chatRoom = chatRoomRepository.findById(chatId)
                .orElseThrow(() -> new ResourceNotFoundException("Chat room not found"));

        // Verify the user is a participant in this chat
        boolean isParticipant = chatRoom.getParticipants().stream()
                .anyMatch(user -> user.getId().equals(userId));

        if (!isParticipant) {
            throw new ResourceNotFoundException("You are not authorized to delete this conversation");
        }

        // Delete all messages in the chat room
        List<Message> messages = messageRepository.findByChatRoomIdOrderByCreatedAt(chatId);
        messageRepository.deleteAll(messages);
        
        // Delete the chat room
        chatRoomRepository.delete(chatRoom);
    }

    private ChatRoomDto convertToChatRoomDto(ChatRoom chatRoom) {
        // Convert all participants into ChatUserDto
        List<ChatUserDto> participants = chatRoom.getParticipants().stream()
                .map(user -> new ChatUserDto(user.getId(), user.getName(), user.getEmail()))
                .toList();

        // Get the last message if it exists
        Message lastMessage = chatRoom.getMessages().stream()
                .reduce((first, second) -> second)  // last element in stream
                .orElse(null);

        String lastMessageContent = lastMessage != null ? lastMessage.getContent() : null;
        String lastMessageTime = lastMessage != null ? lastMessage.getCreatedAt().toString() : null;

        return new ChatRoomDto(
                chatRoom.getId(),
                participants,
                lastMessageContent,
                lastMessageTime
        );
    }

}
