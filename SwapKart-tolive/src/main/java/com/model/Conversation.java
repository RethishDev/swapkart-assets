package com.model;

import com.entity.ChatRoom;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "conversations")
public class Conversation {
    
    @Id
    private String id;
    
    @Column(name = "participant_id", nullable = false)
    private Long participantId;
    
    @Column(name = "participant_name")
    private String participantName;
    
    @Column(name = "last_message")
    private String lastMessage;
    
    @Column(name = "last_message_time")
    private LocalDateTime lastMessageTime;
    
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chat_room_id", nullable = false)
    private ChatRoom chatRoom;
    
    // Additional fields can be added as needed
    
    public Conversation() {
        // Default constructor
    }
    
    public Conversation(String id, Long participantId, String participantName) {
        this.id = id;
        this.participantId = participantId;
        this.participantName = participantName;
        this.lastMessageTime = LocalDateTime.now();
    }
}
