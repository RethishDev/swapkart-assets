package com.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStats {
    private long totalUsers;
    private long newUsersToday;
    private long newUsersThisWeek;
    private long newUsersThisMonth;
    private long totalItems;
    private long newItemsToday;
    private long activeItems;
    private long pendingItems;
    private Map<String, Long> userGrowth;
    private Map<String, Long> itemGrowth;
}