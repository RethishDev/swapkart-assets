package com.repository;

import com.model.Conversation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ConversationRepository extends JpaRepository<Conversation, Long> {
    
    // Find conversation by ID
    @Query("SELECT c FROM Conversation c WHERE c.id = :id")
    Optional<Conversation> findById(@Param("id") String id);
    
    // Find all conversations, ordered by last message time
    @Query("SELECT c FROM Conversation c ORDER BY c.lastMessageTime DESC")
    Page<Conversation> findAllOrderByLastMessageTimeDesc(Pageable pageable);
    
    // Find conversations where the user is a participant
    @Query("SELECT c FROM Conversation c WHERE c.participantId = :userId ORDER BY c.lastMessageTime DESC")
    List<Conversation> findByParticipantId(@Param("userId") Long userId);
    
    // Find a conversation between two users
    @Query("SELECT c FROM Conversation c WHERE c.participantId = :userId1 OR c.participantId = :userId2")
    List<Conversation> findConversationBetweenUsers(
        @Param("userId1") Long userId1, 
        @Param("userId2") Long userId2
    );
    
    // Update the last message time for a conversation
    @Query("UPDATE Conversation c SET c.lastMessage = :lastMessage, c.lastMessageTime = CURRENT_TIMESTAMP WHERE c.id = :conversationId")
    void updateLastMessage(
        @Param("conversationId") String conversationId,
        @Param("lastMessage") String lastMessage
    );
    
    // Count unread messages for a user
    @Query("SELECT COUNT(m) FROM Message m WHERE m.chatRoom.id = :chatId AND m.read = false AND m.sender.id != :userId")
    long countUnreadMessages(@Param("chatId") Long chatId, @Param("userId") Long userId);
}
