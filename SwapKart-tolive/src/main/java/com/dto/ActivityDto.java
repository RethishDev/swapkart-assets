package com.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActivityDto {
    private Long id;
    private String type;
    private String description;
    private String createdAt;
    private Long itemId;
    private String itemTitle;
}
