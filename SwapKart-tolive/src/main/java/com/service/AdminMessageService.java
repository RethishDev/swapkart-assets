package com.service;

import com.dto.ConversationDto;
import com.dto.MessageDto;
import java.util.List;

public interface AdminMessageService {
    List<ConversationDto> getAllConversations();
    List<MessageDto> getMessages(String chatId);
    void markMessagesAsRead(String chatId);
    MessageDto sendMessage(MessageDto messageDto);
}
