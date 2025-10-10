package com.controller;

import com.dto.ActionRequest;
import com.dto.ActionResponse;
import com.entity.Action.ActionType;
import com.service.ActionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/api/actions")
@RequiredArgsConstructor
public class ActionController {

    private final ActionService actionService;

    @PostMapping
    public ResponseEntity<ActionResponse> createAction(
            @Valid @RequestBody ActionRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        Long userId = Long.parseLong(userDetails.getUsername());
        ActionResponse response = actionService.createAction(
                userId,
                request.getItemId(),
                request.getType(),
                request.getMetadata()
        );
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{itemId}/{type}")
    public ResponseEntity<Void> deleteAction(
            @PathVariable Long itemId,
            @PathVariable ActionType type,
            @AuthenticationPrincipal UserDetails userDetails) {
        Long userId = Long.parseLong(userDetails.getUsername());
        actionService.deleteAction(userId, itemId, type);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/user/{type}")
    public ResponseEntity<List<ActionResponse>> getUserActions(
            @PathVariable ActionType type,
            @AuthenticationPrincipal UserDetails userDetails) {
        Long userId = Long.parseLong(userDetails.getUsername());
        return ResponseEntity.ok(actionService.getUserActions(userId, type));
    }

    @GetMapping("/item/{itemId}/{type}")
    public ResponseEntity<List<ActionResponse>> getItemActions(
            @PathVariable Long itemId,
            @PathVariable ActionType type) {
        return ResponseEntity.ok(actionService.getItemActions(itemId, type));
    }

    @GetMapping("/item/{itemId}/{type}/count")
    public ResponseEntity<Integer> getActionCount(
            @PathVariable Long itemId,
            @PathVariable ActionType type) {
        return ResponseEntity.ok(actionService.getActionCount(itemId, type));
    }

    @PostMapping("/toggle")
    public ResponseEntity<Void> toggleAction(
            @Valid @RequestBody ActionRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        Long userId = Long.parseLong(userDetails.getUsername());
        actionService.toggleAction(
                userId,
                request.getItemId(),
                request.getType(),
                request.getMetadata()
        );
        return ResponseEntity.ok().build();
    }
}
