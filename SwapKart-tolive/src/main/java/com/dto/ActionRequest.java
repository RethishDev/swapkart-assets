package com.dto;

import com.entity.Action.ActionType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ActionRequest {
    @NotNull(message = "Item ID is required")
    private Long itemId;

    @NotNull(message = "Action type is required")
    private ActionType type;

    private String metadata;
}
