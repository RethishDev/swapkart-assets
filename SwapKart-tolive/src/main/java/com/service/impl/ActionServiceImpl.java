package com.service.impl;

import com.dto.ActionResponse;
import com.entity.*;
import com.entity.Action.ActionType;
import com.exception.ResourceNotFoundException;
import com.repository.ActionRepository;
import com.repository.ItemRepository;
import com.repository.UserRepository;
import com.service.ActionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ActionServiceImpl implements ActionService {

    private final ActionRepository actionRepository;
    private final UserRepository userRepository;
    private final ItemRepository itemRepository;

    @Override
    @Transactional
    public ActionResponse createAction(Long userId, Long itemId, ActionType type, String metadata) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        Item item = itemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Item not found with id: " + itemId));

        Action action = Action.builder()
                .user(user)
                .item(item)
                .type(type)
                .metadata(metadata)
                .build();

        Action savedAction = actionRepository.save(action);
        return ActionResponse.fromEntity(savedAction);
    }

    @Override
    @Transactional
    public void deleteAction(Long userId, Long itemId, ActionType type) {
        actionRepository.deleteByUserAndItemAndType(
                userRepository.getReferenceById(userId),
                itemRepository.getReferenceById(itemId),
                type
        );
    }

    @Override
    public boolean hasUserPerformedAction(Long userId, Long itemId, ActionType type) {
        return actionRepository.existsByUserAndItemAndType(
                userRepository.getReferenceById(userId),
                itemRepository.getReferenceById(itemId),
                type
        );
    }

    @Override
    public int getActionCount(Long itemId, ActionType type) {
        return actionRepository.countByItemAndType(
                itemRepository.getReferenceById(itemId),
                type
        );
    }

    @Override
    public List<ActionResponse> getUserActions(Long userId, ActionType type) {
        return actionRepository.findByUserAndType(
                        userRepository.getReferenceById(userId),
                        type
                ).stream()
                .map(ActionResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    public List<ActionResponse> getItemActions(Long itemId, ActionType type) {
        return actionRepository.findByItemAndType(
                        itemRepository.getReferenceById(itemId),
                        type
                ).stream()
                .map(ActionResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void toggleAction(Long userId, Long itemId, ActionType type, String metadata) {
        User user = userRepository.getReferenceById(userId);
        Item item = itemRepository.getReferenceById(itemId);

        actionRepository.findByUserAndItemAndType(user, item, type)
                .ifPresentOrElse(
                        action -> actionRepository.delete(action),
                        () -> createAction(userId, itemId, type, metadata)
                );
    }
}
