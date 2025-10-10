package com.service.impl;

import com.entity.Notification;
import com.entity.User;
import com.exception.ResourceNotFoundException;
import com.repository.NotificationRepository;
import com.repository.UserRepository;
import com.service.NotificationInterfaceService;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationInterfaceService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    @Transactional
    public void sendNotification(Long userId, String title, String message, String url) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Notification notification = new Notification();
        notification.setUser(user);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setUrl(url);
        notification.setRead(false);
        notification.setCreatedAt(LocalDateTime.now());

        notificationRepository.save(notification);

        // Send real-time notification via WebSocket
        messagingTemplate.convertAndSendToUser(
                userId.toString(),
                "/queue/notifications",
                new NotificationDTO(notification)
        );
    }

    @Data
    @AllArgsConstructor
    public static class NotificationDTO {
        private Long id;
        private String title;
        private String message;
        private String url;
        private boolean read;
        private LocalDateTime createdAt;

        public NotificationDTO(Notification notification) {
            this.id = notification.getId();
            this.title = notification.getTitle();
            this.message = notification.getMessage();
            this.url = notification.getUrl();
            this.read = notification.isRead();
            this.createdAt = notification.getCreatedAt();
        }
    }
}