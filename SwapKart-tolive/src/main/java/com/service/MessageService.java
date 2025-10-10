package com.service;

import com.dto.MessageRequest;
import com.entity.*;
import com.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepo;
    private final UserRepository userRepo;
    private final ItemRepository itemRepo;
    private final ChatRoomRepository chatRoomRepo;

    @Transactional
    public Message sendMessage(MessageRequest request) {
        // Get the sender (current user)
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User sender = userRepo.findByEmail(email).orElseThrow();
        
        // Get the receiver and item
        User receiver = userRepo.findById(request.getReceiverId())
                .orElseThrow(() -> new RuntimeException("Receiver not found"));
        Item item = itemRepo.findById(request.getItemId())
                .orElseThrow(() -> new RuntimeException("Item not found"));
        
        // Find or create a chat room
        ChatRoom chatRoom = findOrCreateChatRoom(sender, receiver, item);
        
        // Create and save the message
        Message message = Message.builder()
                .sender(sender)
                .chatRoom(chatRoom)
                .item(item)
                .content(request.getMessageText())
                .createdAt(LocalDateTime.now())
                .build();

        return messageRepo.save(message);
    }
    
    private ChatRoom findOrCreateChatRoom(User user1, User user2, Item item) {
        // Try to find an existing chat room between these users for this item
        Optional<ChatRoom> existingChatRoom = chatRoomRepo.findChatRoomByParticipantsAndItem(
                user1.getId(), 
                user2.getId(), 
                item.getId()
        );
        
        if (existingChatRoom.isPresent()) {
            return existingChatRoom.get();
        }
        
        // Create a new chat room if one doesn't exist
        ChatRoom newChatRoom = new ChatRoom();
        newChatRoom.setName(String.format("Chat - %s & %s - %s", 
                user1.getName(),
                user2.getName(),
                item.getTitle()));
        newChatRoom.addParticipant(user1);
        newChatRoom.addParticipant(user2);
        newChatRoom.setItem(item);
        
        return chatRoomRepo.save(newChatRoom);
    }

    public List<Message> getInbox() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepo.findByEmail(email).orElseThrow();
        // Get all chat rooms where the user is a participant
        List<ChatRoom> userChatRooms = chatRoomRepo.findByParticipantsContaining(user);
        // Get all messages from these chat rooms where the user is not the sender
        return messageRepo.findByChatRoomInAndSenderNot(userChatRooms, user);
    }

    public List<Message> getSent() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepo.findByEmail(email).orElseThrow();
        return messageRepo.findBySender(user);
    }

    public long getUnreadMessageCount() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepo.findByEmail(email).orElseThrow();
        
        // Get all chat rooms where the user is a participant
        List<ChatRoom> userChatRooms = chatRoomRepo.findByParticipantsContaining(currentUser);
        
        if (userChatRooms.isEmpty()) {
            return 0;
        }
        
        // Count unread messages in these chat rooms
        return messageRepo.countUnreadMessages(userChatRooms, currentUser);
    }

    @Transactional
    public void markAsRead(Long messageId) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepo.findByEmail(email).orElseThrow();
        
        Message message = messageRepo.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));
        
        // Only mark as read if the current user is the recipient
        if (!message.getSender().equals(currentUser)) {
            message.setRead(true);
            messageRepo.save(message);
        }
    }

    @Transactional
    public void markAllAsRead(Long chatRoomId) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepo.findByEmail(email).orElseThrow();
        messageRepo.markMessagesAsRead(chatRoomId, currentUser.getId());
    }
}
