package com.service;

import com.dto.ActionResponse;
import com.entity.Action.ActionType;
import com.entity.User;

import java.util.List;

public interface ActionService {
    ActionResponse createAction(Long userId, Long itemId, ActionType type, String metadata);

    void deleteAction(Long userId, Long itemId, ActionType type);

    boolean hasUserPerformedAction(Long userId, Long itemId, ActionType type);

    int getActionCount(Long itemId, ActionType type);

    List<ActionResponse> getUserActions(Long userId, ActionType type);

    List<ActionResponse> getItemActions(Long itemId, ActionType type);

    void toggleAction(Long userId, Long itemId, ActionType type, String metadata);
}
