package com.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageDto {
    private Long id;
    private Long chatRoomId;
    private Long senderId;
    private String content;
    private String timestamp;
    private boolean isRead;
}
