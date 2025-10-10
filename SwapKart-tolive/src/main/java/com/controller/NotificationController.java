package com.controller;

import com.entity.Notification;
import com.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public List<Notification> myNotifications() {
        return notificationService.getMyNotifications();
    }

    @GetMapping("/unread")
    public List<Notification> getUnreadNotifications() {
        return notificationService.getUnreadNotifications();
    }

    @GetMapping("/unread/count")
    public Map<String, Long> getUnreadCount() {
        long count = notificationService.countUnreadNotifications();
        return Map.of("count", count);
    }

    @PutMapping("/{id}/read")
    public void markAsRead(@PathVariable Long id) {
        notificationService.markAsRead(id);
    }
}
