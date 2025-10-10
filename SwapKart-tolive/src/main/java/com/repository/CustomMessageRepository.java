package com.repository;

import com.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface CustomMessageRepository extends JpaRepository<Message, Long> {

    // Find messages by chat ID, ordered by timestamp
    List<Message> findByChatRoomIdOrderByCreatedAtAsc(Long chatId);

    // Count unread messages in a chat
    @Query("SELECT COUNT(m) FROM Message m WHERE m.chatRoom.id = :chatId AND m.read = false")
    long countByChatRoomIdAndReadFalse(@Param("chatId") Long chatId);

    // Mark messages as read for a specific chat and user
    @Modifying
    @Transactional
    @Query("UPDATE Message m SET m.read = true WHERE m.chatRoom.id = :chatId AND m.sender.id != :userId AND m.read = false")
    void markMessagesAsRead(@Param("chatId") Long chatId, @Param("userId") Long userId);

    // Count unread messages for a specific chat and user
    @Query("SELECT COUNT(m) FROM Message m WHERE m.chatRoom.id = :chatId AND m.read = false AND m.sender.id != :userId")
    long countByChatRoomIdAndReadFalseAndSenderIdNot(@Param("chatId") Long chatId, @Param("userId") Long userId);
}
