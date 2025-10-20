package com.repository;

import com.entity.ChatRoom;
import com.entity.Item;
import com.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {
    
    @Query("SELECT cr FROM ChatRoom cr " +
           "JOIN cr.participants p1 " +
           "JOIN cr.participants p2 " +
           "WHERE p1.id = :userId1 AND p2.id = :userId2 AND cr.item.id = :itemId")
    Optional<ChatRoom> findChatRoomByParticipantsAndItem(
        @Param("userId1") Long userId1,
        @Param("userId2") Long userId2,
        @Param("itemId") Long itemId
    );
    
    @Query("SELECT cr FROM ChatRoom cr " +
           "JOIN cr.participants p " +
           "WHERE p.id = :userId AND cr.status = 'ACTIVE'")
    List<ChatRoom> findActiveChatRoomsByUserId(@Param("userId") Long userId);
    
    @Query("SELECT CASE WHEN COUNT(cr) > 0 THEN true ELSE false END " +
           "FROM ChatRoom cr JOIN cr.participants p WHERE cr.id = :roomId AND p.id = :userId")
    boolean existsByIdAndParticipant(@Param("roomId") Long roomId, @Param("userId") Long userId);
    
    @Query("SELECT cr FROM ChatRoom cr " +
           "JOIN FETCH cr.participants p " +
           "WHERE cr.id = :roomId")
    Optional<ChatRoom> findByIdWithParticipants(@Param("roomId") Long roomId);
    
    // Find all chat rooms where a specific user is a participant
    List<ChatRoom> findByParticipantsContaining(User user);
    
    @Query("""
        SELECT DISTINCT cr 
        FROM ChatRoom cr 
        JOIN cr.participants p 
        WHERE p.id = :userId
    """)
    List<ChatRoom> findByParticipantId(@Param("userId") Long userId);
    
    @Query("""
        SELECT DISTINCT cr 
        FROM ChatRoom cr 
        JOIN cr.participants p 
        WHERE cr.id = :chatId 
        AND p.id = :userId
    """)
    Optional<ChatRoom> findByIdAndParticipantId(
        @Param("chatId") Long chatId, 
        @Param("userId") Long userId
    );

    @Modifying
    @Query("DELETE FROM Message m WHERE m.chatRoom.id IN (SELECT c.id FROM ChatRoom c WHERE c.item.id = :itemId)")
    void deleteMessagesByItemId(@Param("itemId") Long itemId);

    @Modifying
    @Query("DELETE FROM ChatRoom c WHERE c.item.id = :itemId")
    void deleteByItemId(@Param("itemId") Long itemId);

    @Query("SELECT DISTINCT cr FROM ChatRoom cr " +
            "LEFT JOIN cr.participants p " +
            "WHERE cr.item.user.id = :userId OR p.id = :userId")
    List<ChatRoom> findByItem_UserIdOrParticipantId(@Param("userId") Long userId, @Param("userId") Long userId2);
}
