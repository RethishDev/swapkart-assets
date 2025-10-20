package com.service;

import com.dto.DashboardStats;
import com.repository.ItemRepository;
import com.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final UserRepository userRepository;
    private final ItemRepository itemRepository;

    public DashboardStats getDashboardStats() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startOfDay = now.toLocalDate().atStartOfDay();
        LocalDateTime startOfWeek = now.toLocalDate().with(TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY)).atStartOfDay();
        LocalDateTime startOfMonth = now.toLocalDate().withDayOfMonth(1).atStartOfDay();

        long totalUsers = userRepository.count();
        long newUsersToday = userRepository.countByCreatedAtAfter(startOfDay);
        long newUsersThisWeek = userRepository.countByCreatedAtAfter(startOfWeek);
        long newUsersThisMonth = userRepository.countByCreatedAtAfter(startOfMonth);

        long totalItems = itemRepository.count();
        long newItemsToday = itemRepository.countByCreatedAtAfter(startOfDay);
        // Use string-based counters to match the DB column (Item.active is a String)
        long activeItems = itemRepository.countByActive("true");
        long pendingItems = itemRepository.countByActive("false");

        Map<String, Long> userGrowth = new HashMap<>();
        Map<String, Long> itemGrowth = new HashMap<>();

        // Last 7 days data
        for (int i = 6; i >= 0; i--) {
            LocalDate date = LocalDate.now().minusDays(i);
            LocalDateTime start = date.atStartOfDay();
            LocalDateTime end = date.plusDays(1).atStartOfDay();

            long users = userRepository.countByCreatedAtBetween(start, end);
            long items = itemRepository.countByCreatedAtBetween(start, end);

            userGrowth.put(date.toString(), users);
            itemGrowth.put(date.toString(), items);
        }

        return DashboardStats.builder()
                .totalUsers(totalUsers)
                .newUsersToday(newUsersToday)
                .newUsersThisWeek(newUsersThisWeek)
                .newUsersThisMonth(newUsersThisMonth)
                .totalItems(totalItems)
                .newItemsToday(newItemsToday)
                .activeItems(activeItems)
                .pendingItems(pendingItems)
                .userGrowth(userGrowth)
                .itemGrowth(itemGrowth)
                .build();
    }
}