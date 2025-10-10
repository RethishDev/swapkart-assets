package com.mapper;

import com.dto.ChatRoomDto;
import com.dto.ChatUserDto;
import com.entity.ChatRoom;
import com.entity.User;

import java.util.List;

public class ChatRoomMapper {

    public static ChatRoomDto toDto(ChatRoom chatRoom) {
        // Convert Set<User> to List<ChatUserDto>
        List<ChatUserDto> participantDtos = chatRoom.getParticipants()
                .stream()
                .map(ChatRoomMapper::mapUserToDto)
                .toList();

        // Get last message (if any)
        String lastMessage = chatRoom.getMessages().isEmpty()
                ? null
                : chatRoom.getMessages()
                .get(chatRoom.getMessages().size() - 1)
                .getContent();

        String lastMessageTime = chatRoom.getMessages().isEmpty()
                ? null
                : chatRoom.getMessages()
                .get(chatRoom.getMessages().size() - 1)
                .getCreatedAt()
                .toString();

        return new ChatRoomDto(
                chatRoom.getId(),
                participantDtos,
                lastMessage,
                lastMessageTime
        );
    }

    private static ChatUserDto mapUserToDto(User user) {
        return new ChatUserDto(
                user.getId(),
                user.getName(),
                user.getEmail()
        );
    }
}
