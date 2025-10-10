package com.controller;

import com.dto.ConversationDto;
import com.dto.MessageDto;
import com.service.AdminMessageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/messages")
public class AdminMessageController {

    private final AdminMessageService adminMessageService;

    @Autowired
    public AdminMessageController(AdminMessageService adminMessageService) {
        this.adminMessageService = adminMessageService;
    }

    @GetMapping("/conversations")
    public ResponseEntity<List<ConversationDto>> getAllConversations() {
        List<ConversationDto> conversations = adminMessageService.getAllConversations();
        return ResponseEntity.ok(conversations);
    }

    @GetMapping("/{chatId}/messages")
    public ResponseEntity<List<MessageDto>> getMessages(@PathVariable String chatId) {
        List<MessageDto> messages = adminMessageService.getMessages(chatId);
        return ResponseEntity.ok(messages);
    }

    @PostMapping("/{chatId}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable String chatId) {
        adminMessageService.markMessagesAsRead(chatId);
        return ResponseEntity.ok().build();
    }

    @PostMapping
    public ResponseEntity<MessageDto> sendMessage(@RequestBody MessageDto messageDto) {
        MessageDto sentMessage = adminMessageService.sendMessage(messageDto);
        return ResponseEntity.ok(sentMessage);
    }
}
