package com.repository;

import com.entity.ChatRoom;
import com.entity.Message;
import com.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findByChatRoomInAndSenderNot(List<ChatRoom> chatRooms, User sender);
    List<Message> findBySender(User sender);
    List<Message> findByChatRoomIdOrderByCreatedAt(Long chatRoomId);
    List<Message> findByChatRoomId(Long chatRoomId);

    @Modifying
    @Transactional
    @Query("UPDATE Message m SET m.read = true WHERE m.chatRoom.id = :chatRoomId AND m.sender.id != :userId AND m.read = false")
    void markMessagesAsRead(@Param("chatRoomId") Long chatRoomId, @Param("userId") Long userId);

    @Query("""
        SELECT DISTINCT 
            cr.id as chatRoomId,
            cr.id as id,
            CASE 
                WHEN u1.id = :userId THEN u2.name 
                ELSE u1.name 
            END as otherUserName,
            '/images/default-avatar.png' as otherUserAvatar,
            (SELECT m.content FROM Message m WHERE m.chatRoom = cr ORDER BY m.createdAt DESC LIMIT 1) as lastMessage,
            (SELECT MAX(m.createdAt) FROM Message m WHERE m.chatRoom = cr) as lastMessageTime,
            EXISTS (
                SELECT 1 FROM Message m 
                WHERE m.chatRoom = cr 
                AND m.sender.id != :userId 
                AND m.read = false
            ) as hasUnread
        FROM ChatRoom cr
        JOIN cr.participants u1
        JOIN cr.participants u2
        WHERE (u1.id = :userId OR u2.id = :userId)
        AND u1.id != u2.id
        ORDER BY lastMessageTime DESC NULLS LAST
    """)
    List<Object[]> findUserConversations(@Param("userId") Long userId);

    @Query("""
        SELECT COUNT(m) FROM Message m 
        WHERE m.chatRoom IN :chatRooms 
        AND m.read = false 
        AND m.sender != :currentUser
    """)
    long countUnreadMessages(
        @Param("chatRooms") List<ChatRoom> chatRooms,
        @Param("currentUser") User currentUser
    );

    List<Message> findByChatRoomIdAndReadFalseAndSenderNot(Long chatRoomId, User sender);

    @Modifying
    @Query("DELETE FROM Message m WHERE m.chatRoom.id = :chatRoomId")
    void deleteByChatRoomId(@Param("chatRoomId") Long chatRoomId);

    @Modifying
    @Transactional
    @Query("DELETE FROM Message m WHERE m.sender.id = :userId")
    void deleteBySenderId(@Param("userId") Long userId);
}
