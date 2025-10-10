package com.dto;

import java.util.List;

public record ChatRoomDto(Long id, List<ChatUserDto> participants, String lastMessage, String lastMessageTime) {}

