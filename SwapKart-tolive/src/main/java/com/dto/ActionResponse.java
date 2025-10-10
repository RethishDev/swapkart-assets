package com.dto;

import com.entity.Action;
import com.entity.Action.ActionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActionResponse {
    private Long id;
    private Long userId;
    private Long itemId;
    private ActionType type;
    private LocalDateTime createdAt;
    private String metadata;

    public static ActionResponse fromEntity(Action action) {
        return ActionResponse.builder()
                .id(action.getId())
                .userId(action.getUser().getId())
                .itemId(action.getItem().getId())
                .type(action.getType())
                .createdAt(action.getCreatedAt())
                .metadata(action.getMetadata())
                .build();
    }
}
