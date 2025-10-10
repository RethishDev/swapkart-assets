package com.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MessageDto {
    private Long id;
    private Long chatId;
    private Long senderId;
    private String senderName;
    private String content;
    private LocalDateTime timestamp;
    private boolean read;
}
