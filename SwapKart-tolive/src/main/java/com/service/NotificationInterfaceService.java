package com.service;

public interface NotificationInterfaceService {
    void sendNotification(Long userId, String title, String message, String url);
}
