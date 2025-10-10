package com.dto;

import lombok.Data;

@Data
public class MessageRequest {
    private Long receiverId;
    private Long itemId;
    private String messageText;
}
