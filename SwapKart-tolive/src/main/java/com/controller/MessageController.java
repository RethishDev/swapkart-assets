package com.controller;

import com.dto.MessageRequest;
import com.entity.Message;
import com.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;

    @PostMapping("/send")
    public Message send(@RequestBody MessageRequest request) {
        return messageService.sendMessage(request);
    }

    @GetMapping("/inbox")
    public List<Message> inbox() {
        return messageService.getInbox();
    }

    @GetMapping("/sent")
    public List<Message> sent() {
        return messageService.getSent();
    }
    
    @GetMapping("/unread/count")
    public Map<String, Long> getUnreadMessageCount() {
        long count = messageService.getUnreadMessageCount();
        return Map.of("count", count);
    }

    @PutMapping("/{messageId}/read")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> markAsRead(@PathVariable Long messageId) {
        messageService.markAsRead(messageId);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/chat/{chatRoomId}/read")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> markAllAsRead(@PathVariable Long chatRoomId) {
        messageService.markAllAsRead(chatRoomId);
        return ResponseEntity.ok().build();
    }
}
