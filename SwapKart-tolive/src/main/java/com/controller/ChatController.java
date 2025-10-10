package com.controller;

import com.dto.ChatMessageDto;
import com.dto.ChatRoomDto;
import com.dto.ConversationDto;
import com.dto.MessageDto;
import com.entity.User;
import com.repository.UserRepository;
import com.service.ChatService;
import com.service.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @GetMapping("/conversations")
    public ResponseEntity<List<ConversationDto>> getConversations(Authentication authentication) {
        Long currentUserId = getCurrentUserId(authentication);
        return ResponseEntity.ok(chatService.getUserConversations(currentUserId));
    }

    @GetMapping("/{chatId}/messages")
    public ResponseEntity<List<MessageDto>> getChatMessages(
            @PathVariable Long chatId,
            Authentication authentication) {
        Long currentUserId = getCurrentUserId(authentication);
        return ResponseEntity.ok(chatService.getChatMessages(chatId, currentUserId));
    }

    @PostMapping("/{chatId}/send")
    public ResponseEntity<MessageDto> sendChatMessage(
            @PathVariable Long chatId,
            @RequestBody MessageDto messageDto,
            Authentication authentication) {
        Long currentUserId = getCurrentUserId(authentication);
        messageDto.setSenderId(currentUserId);
        messageDto.setChatId(chatId);
        return ResponseEntity.ok(chatService.saveMessage(messageDto));
    }

    @PostMapping("/rooms")
    public ResponseEntity<ChatRoomDto> createOrGetChatRoom(
            @RequestParam Long participantId,
            @RequestParam(required = false) Long itemId,
            Authentication authentication) {
        Long currentUserId = getCurrentUserId(authentication);
        ChatRoomDto chatRoom = chatService.getOrCreateChatRoom(currentUserId, participantId, itemId);
        return ResponseEntity.ok(chatRoom);
    }

    @GetMapping("/rooms")
    public ResponseEntity<List<ChatRoomDto>> getUserChatRooms(Authentication authentication) {
        Long currentUserId = getCurrentUserId(authentication);
        return ResponseEntity.ok(chatService.getUserChatRooms(currentUserId));
    }

    @GetMapping("/rooms/{roomId}/messages")
    public ResponseEntity<List<MessageDto>> getChatHistory(
            @PathVariable Long roomId,
            Authentication authentication) {
        Long currentUserId = getCurrentUserId(authentication);
        return ResponseEntity.ok(chatService.getChatHistory(roomId, currentUserId));
    }

    @MessageMapping("/chat.send")
    public void sendMessage(@Payload ChatMessageDto message, Authentication authentication) {
        Long currentUserId = getCurrentUserId(authentication);
        message.setSenderId(currentUserId);
        chatService.sendMessage(message);
    }

    @PostMapping("/messages/{messageId}/read")
    public ResponseEntity<Void> markAsRead(
            @PathVariable Long messageId,
            @RequestParam Long chatRoomId,
            Authentication authentication) {
        Long currentUserId = getCurrentUserId(authentication);
        chatService.markMessagesAsRead(chatRoomId, currentUserId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/conversations/{chatId}")
    public ResponseEntity<Void> deleteConversation(
            @PathVariable Long chatId,
            Authentication authentication) {
        Long currentUserId = getCurrentUserId(authentication);
        chatService.deleteConversation(chatId, currentUserId);
        return ResponseEntity.ok().build();
    }
    
    @Autowired
    private JwtService jwtService;
    
    @Autowired
    private UserRepository userRepository;
    
    private Long getCurrentUserId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new SecurityException("User not authenticated");
        }
        
        // Get the JWT token from the authentication object
        String token = null;
        if (authentication.getCredentials() instanceof String) {
            token = (String) authentication.getCredentials();
        } else if (authentication.getPrincipal() instanceof UserDetails) {
            // If we have UserDetails, try to get the username (email)
            String username = ((UserDetails) authentication.getPrincipal()).getUsername();
            // Try to find user by email
            return userRepository.findByEmail(username)
                .map(User::getId)
                .orElseThrow(() -> new SecurityException("User not found"));
        } else if (authentication.getPrincipal() instanceof String) {
            // If principal is a string, it might be the username (email)
            String username = (String) authentication.getPrincipal();
            return userRepository.findByEmail(username)
                .map(User::getId)
                .orElseThrow(() -> new SecurityException("User not found"));
        }
        
        throw new SecurityException("Could not determine user ID from authentication");
    }
}
