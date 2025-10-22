package com.config;

import jakarta.servlet.http.HttpSessionEvent;
import jakarta.servlet.http.HttpSessionListener;
import org.springframework.stereotype.Component;

@Component
public class SessionCounter implements HttpSessionListener {
    private static int activeSessions = 0;

    public static int getActiveSessions() {
        return activeSessions;
    }

    @Override
    public void sessionCreated(HttpSessionEvent se) {
        activeSessions++;
    }

    @Override
    public void sessionDestroyed(HttpSessionEvent se) {
        if (activeSessions > 0) {
            activeSessions--;
        }
    }
}