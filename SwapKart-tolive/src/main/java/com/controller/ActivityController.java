package com.controller;

import com.dto.ActivityDto;
import com.service.ActivityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/activities")
@RequiredArgsConstructor
public class ActivityController {

    private final ActivityService activityService;

    @GetMapping("/recent")
    public ResponseEntity<?> getRecentActivities(
            @RequestParam(defaultValue = "5") int limit) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated() || !(authentication.getPrincipal() instanceof UserDetails)) {
                log.warn("Unauthenticated or invalid request to /api/activities/recent");
                return ResponseEntity.status(401).body("Authentication required");
            }
            
            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            String username = userDetails.getUsername();
            log.debug("Fetching recent activities for user: {}", username);
            
            List<ActivityDto> activities = activityService.getRecentActivitiesByUsername(username, limit);
            return ResponseEntity.ok(activities);
            
        } catch (Exception e) {
            log.error("Error fetching recent activities", e);
            return ResponseEntity.status(500).body("Error fetching activities: " + e.getMessage());
        }
    }
}
