package com.controller;

import com.dto.ItemCountsDTO;
import com.dto.ItemRequest;
import com.dto.ItemResponse;
import com.dto.ItemResponseDto;
import com.entity.Item;
import com.entity.ItemType;
import com.entity.enums.ItemStatus;
import com.service.ItemService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/items")
@RequiredArgsConstructor
@Slf4j
public class ItemController {

    private final ItemService itemService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> createItem(
            @RequestParam String title,
            @RequestParam String description,
            @RequestParam ItemType type,
            @RequestParam String category,
            @RequestParam String city,
            @RequestParam String pincode,
            @RequestParam String condition,
            @RequestParam(required = false) Double price,
            @RequestParam(required = false) MultipartFile[] images,
            @RequestParam(required = false, defaultValue = "AVAILABLE") String status
    ) {
        try {
            // Get the authenticated user's email
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String userEmail = authentication.getName();

            if (userEmail == null || userEmail.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Collections.singletonMap("error", "User not authenticated"));
            }

            ItemRequest request = new ItemRequest();
            request.setTitle(title);
            request.setDescription(description);
            request.setType(type);
            request.setCategory(category);
            request.setCity(city);
            request.setPincode(pincode);
            request.setCondition(condition);
            // Set status, default to AVAILABLE if not provided or invalid
            try {
                request.setStatus(ItemStatus.valueOf(status));
            } catch (IllegalArgumentException e) {
                request.setStatus(ItemStatus.AVAILABLE);
            }

            // Only set price if it's provided and the item type is SELL
            if (price != null && type == ItemType.SELL) {
                request.setPrice(price);
            } else {
                request.setPrice(null);
            }

            Item item = itemService.addItem(request, images);
            return new ResponseEntity<>(item, HttpStatus.CREATED);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getItem(@PathVariable String id) {
        try {
            // Try to parse the ID as a long
            Long itemId = Long.parseLong(id);
            Item item = itemService.getItemById(itemId);
            return ResponseEntity.ok(ItemResponse.fromItem(item));
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body("Invalid item ID format. ID must be a number.");
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Item> updateItem(
            @PathVariable Long id,
            @RequestBody ItemRequest request) {
        return ResponseEntity.ok(itemService.updateItem(id, request));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteItem(@PathVariable Long id) {
        itemService.deleteItem(id);
    }

    @GetMapping
    public ResponseEntity<Page<ItemResponse>> getAllItems(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt,desc") String[] sort) {

        String sortField = sort[0];
        String sortDirection = sort.length > 1 ? sort[1] : "asc";

        Sort.Direction direction = sortDirection.equalsIgnoreCase("desc")
                ? Sort.Direction.DESC
                : Sort.Direction.ASC;

        Pageable pageable = PageRequest.of(
                page,
                size,
                Sort.by(direction, sortField)
        );

        Page<Item> itemsPage = itemService.getAllItems(pageable);
        Page<ItemResponse> responsePage = itemsPage.map(ItemResponse::fromItem);
        return ResponseEntity.ok(responsePage);
    }

    @GetMapping("/search")
    public ResponseEntity<Page<ItemResponse>> searchItems(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) ItemType type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt,desc") String[] sort) {

        String sortField = sort[0];
        String sortDirection = sort.length > 1 ? sort[1] : "asc";

        Sort.Direction direction = sortDirection.equalsIgnoreCase("desc")
                ? Sort.Direction.DESC
                : Sort.Direction.ASC;

        Pageable pageable = PageRequest.of(
                page,
                size,
                Sort.by(direction, sortField)
        );

        Page<Item> itemsPage = itemService.searchItems(query, city, category, type, pageable);
        Page<ItemResponse> responsePage = itemsPage.map(ItemResponse::fromItem);
        return ResponseEntity.ok(responsePage);
    }

    @GetMapping("/my-items")
    public ResponseEntity<Page<ItemResponse>> getCurrentUserItems(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt,desc") String[] sort) {

        String sortField = sort[0];
        String sortDirection = sort.length > 1 ? sort[1] : "asc";

        Sort.Direction direction = sortDirection.equalsIgnoreCase("desc")
                ? Sort.Direction.DESC
                : Sort.Direction.ASC;

        Pageable pageable = PageRequest.of(
                page,
                size,
                Sort.by(direction, sortField)
        );

        Page<Item> itemsPage = itemService.getCurrentUserItems(pageable);
        Page<ItemResponse> responsePage = itemsPage.map(ItemResponse::fromItem);
        return ResponseEntity.ok(responsePage);
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<Page<ItemResponse>> getUserItems(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt,desc") String[] sort) {

        String sortField = sort[0];
        String sortDirection = sort.length > 1 ? sort[1] : "asc";

        Sort.Direction direction = sortDirection.equalsIgnoreCase("desc")
                ? Sort.Direction.DESC
                : Sort.Direction.ASC;

        Pageable pageable = PageRequest.of(
                page,
                size,
                Sort.by(direction, sortField)
        );

        Page<Item> itemsPage = itemService.getItemsByUser(userId, pageable);
        Page<ItemResponse> responsePage = itemsPage.map(ItemResponse::fromItem);
        return ResponseEntity.ok(responsePage);
    }

    @PatchMapping("/{id}/availability")
    public ResponseEntity<Void> toggleAvailability(@PathVariable Long id) {
        itemService.toggleItemAvailability(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/types")
    public ResponseEntity<ItemType[]> getItemTypes() {
        return ResponseEntity.ok(ItemType.values());
    }

    @GetMapping("/categories")
    public ResponseEntity<List<String>> getCategories() {
        return ResponseEntity.ok(itemService.getAllCategories());
    }

    @GetMapping("/cities")
    public ResponseEntity<List<String>> getAllCities() {
        return ResponseEntity.ok(itemService.getAllCities());
    }

    @GetMapping("/my/count")
    public ResponseEntity<Long> getMyItemCount() {
        return ResponseEntity.ok(itemService.getCurrentUserItemCount());
    }

    @GetMapping("/count")
    public ResponseEntity<?> getTotalItemCount() {
        try {
            System.out.println("Received request for total item count");
            long count = itemService.getTotalItemCount();
            System.out.println("Returning count: " + count);
            return ResponseEntity.ok(Collections.singletonMap("count", count));
        } catch (Exception e) {
            System.err.println("Error in getTotalItemCount: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Collections.singletonMap("error", "Failed to get item count: " + e.getMessage()));
        }
    }

    @GetMapping("/counts")
    public ResponseEntity<?> getItemCounts() {
        try {
            log.info("Received request for item counts by type");
            ItemCountsDTO counts = itemService.getItemCountsByType();
            log.info("Returning counts - swap: {}, sale: {}, wanted: {}",
                    counts.getSwap(), counts.getSale(), counts.getWanted());
            return ResponseEntity.ok(counts);
        } catch (Exception e) {
            log.error("Error in getItemCounts", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Collections.singletonMap("error", "Failed to get item counts: " + e.getMessage()));
        }
    }

//    @GetMapping("/my-items")
//    public ResponseEntity<List<ItemResponseDto>> getUserItems(
//            @AuthenticationPrincipal UserDetails userDetails) {
//        Long userId = Long.parseLong(userDetails.getUsername());
//        List<ItemResponseDto> items = itemService.getUserItems(userId);
//        return ResponseEntity.ok(items);
//    }
}