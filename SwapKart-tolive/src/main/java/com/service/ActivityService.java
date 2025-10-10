package com.service;

import com.dto.ActivityDto;
import com.entity.Activity;
import com.entity.Item;
import com.entity.User;
import com.repository.ActivityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ActivityService {

    private final ActivityRepository activityRepository;
    private final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM d, yyyy hh:mm a");

    @Transactional
    public Activity logActivity(Activity.ActivityType type, String description, User user, Item item) {
        Activity activity = Activity.builder()
                .type(type)
                .description(description)
                .user(user)
                .item(item)
                .build();
        return activityRepository.save(activity);
    }

    @Transactional(readOnly = true)
    public List<ActivityDto> getRecentActivities(Long userId, int limit) {
        Pageable pageable = PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "createdAt"));
        return activityRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public List<ActivityDto> getRecentActivitiesByUsername(String username, int limit) {
        Pageable pageable = PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "createdAt"));
        return activityRepository.findByUserEmailOrderByCreatedAtDesc(username, pageable)
                .stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    private ActivityDto convertToDto(Activity activity) {
        return ActivityDto.builder()
                .id(activity.getId())
                .type(activity.getType().name())
                .description(activity.getDescription())
                .createdAt(activity.getCreatedAt().format(formatter))
                .itemId(activity.getItem() != null ? activity.getItem().getId() : null)
                .itemTitle(activity.getItem() != null ? activity.getItem().getTitle() : null)
                .build();
    }
}
