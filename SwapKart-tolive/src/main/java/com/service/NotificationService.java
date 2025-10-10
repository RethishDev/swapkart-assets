package com.service;

import com.entity.Notification;
import com.entity.User;
import com.repository.NotificationRepository;
import com.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepo;
    private final UserRepository userRepo;

    public void createNotification(String message, Long userId) {
        User user = userRepo.findById(userId).orElseThrow();
        Notification n = Notification.builder()
                .message(message)
                .read(false)
                .createdAt(LocalDateTime.now())
                .user(user)
                .build();
        notificationRepo.save(n);
    }

    public List<Notification> getMyNotifications() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return notificationRepo.findByUserOrderByCreatedAtDesc(user);
    }

    public List<Notification> getUnreadNotifications() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return notificationRepo.findByUserAndReadFalseOrderByCreatedAtDesc(user);
    }
    
    public long countUnreadNotifications() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return notificationRepo.countByUserAndReadFalse(user);
    }

    @Transactional
    public void markAsRead(Long id) {
        Notification n = notificationRepo.findById(id).orElseThrow();
        n.setRead(true);
        notificationRepo.save(n);
    }
}
