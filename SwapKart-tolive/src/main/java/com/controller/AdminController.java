package com.controller;

import com.dto.DashboardStats;
import com.dto.PaginatedResponse;
import com.dto.ItemResponseDto;
import com.entity.*;
import com.repository.*;

import java.util.List;
import com.service.DashboardService;
import com.service.ItemService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.Set;
import java.util.HashSet;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
public class AdminController {

    private final UserRepository userRepository;
    private final ItemRepository itemRepository;
    private final ItemService itemService;
    private final NotificationRepository notificationRepository;
    private final TransactionRepository transactionRepository;
    private final DashboardService dashboardService;
    private final RatingRepository ratingRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final MessageRepository messageRepository;
    private final Logger log = Logger.getLogger(AdminController.class.getName());

    // Constructor injection
    public AdminController(UserRepository userRepository, ItemRepository itemRepository,
                          ItemService itemService,
                          NotificationRepository notificationRepository,
                          TransactionRepository transactionRepository,
                          DashboardService dashboardService,
                           RatingRepository ratingRepository,
                           ChatRoomRepository chatRoomRepository,
                           MessageRepository messageRepository) {
        this.userRepository = userRepository;
        this.itemRepository = itemRepository;
        this.itemService = itemService;
        this.notificationRepository = notificationRepository;
        this.transactionRepository = transactionRepository;
        this.dashboardService = dashboardService;
        this.ratingRepository = ratingRepository;
        this.chatRoomRepository = chatRoomRepository;
        this.messageRepository = messageRepository;
    }

    // Get all users with pagination and filtering - only non-admin users (USER role)
    @GetMapping("/users")
    public ResponseEntity<PaginatedResponse<User>> getUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir,
            @RequestParam(required = false) String search) {

        Sort sort = sortDir.equalsIgnoreCase("desc")
                ? Sort.by(sortBy).descending()
                : Sort.by(sortBy).ascending();

        Pageable pageable = PageRequest.of(page, size, sort);
        Page<User> usersPage;

        try {
            if (search != null && !search.isEmpty()) {
                // Use role-filtered search to return only USER role
                usersPage = userRepository.findByRoleAndSearch(UserRole.USER, search, pageable);
            } else {
                usersPage = userRepository.findByRole(UserRole.USER, pageable);
            }

            PaginatedResponse<User> response = new PaginatedResponse<>(
                    usersPage.getContent(),
                    usersPage.getNumber(),
                    usersPage.getSize(),
                    usersPage.getTotalElements(),
                    usersPage.getTotalPages()
            );

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.log(Level.SEVERE, "Error fetching users", e);
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to load users: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    // Get user by ID
    @GetMapping("/users/{id}")
    public ResponseEntity<User> getUserById(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Update user status (active/inactive)
    @PutMapping("/users/{id}/status")
    public ResponseEntity<?> updateUserStatus(
            @PathVariable Long id,
            @RequestBody Map<String, Boolean> statusRequest) {

        return userRepository.findById(id)
                .map(user -> {
                    try {
                        Boolean active = statusRequest.get("active");
                        if (active == null) {
                            throw new IllegalArgumentException("Active status is required");
                        }
                        user.setActive(active);
                        userRepository.save(user);
                        Map<String, Object> response = new HashMap<>();
                        response.put("message", "User status updated successfully");
                        response.put("active", active);
                        return ResponseEntity.ok(response);
                    } catch (Exception e) {
                        Map<String, String> error = new HashMap<>();
                        error.put("error", "Failed to update user status: " + e.getMessage());
                        return ResponseEntity.badRequest().body(error);
                    }
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Update user role
    @PutMapping("/users/{id}/role")
    public ResponseEntity<?> updateUserRole(
            @PathVariable Long id,
            @RequestBody Map<String, String> roleRequest) {

        return userRepository.findById(id)
                .map(user -> {
                    try {
                        user.setRole(UserRole.valueOf(roleRequest.get("role").toUpperCase()));
                        userRepository.save(user);
                        Map<String, String> response = new HashMap<>();
                        response.put("message", "User role updated successfully");
                        return ResponseEntity.ok(response);
                    } catch (IllegalArgumentException e) {
                        Map<String, String> error = new HashMap<>();
                        error.put("error", "Invalid role provided");
                        return ResponseEntity.badRequest().body(error);
                    }
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/users/{userId}")
    @Transactional
    public ResponseEntity<?> deleteUser(@PathVariable Long userId) {
        try {
            // Check if user exists first
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

            // Disallow deleting admin accounts via this endpoint
            if (user.getRole() == UserRole.ROLE_ADMIN) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Cannot delete admin accounts");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
            }

            // 1) Find all transactions related to the user (as buyer or as item owner / swap item owner)
            Set<Transaction> relatedTransactions = new HashSet<>();
            try {
                List<Transaction> t1 = transactionRepository.findByBuyerId(userId);
                if (t1 != null) relatedTransactions.addAll(t1);
            } catch (Exception ignored) {}

            try {
                List<Transaction> t2 = transactionRepository.findByItemUserId(userId);
                if (t2 != null) relatedTransactions.addAll(t2);
            } catch (Exception ignored) {}

            try {
                List<Transaction> t3 = transactionRepository.findByItem_UserIdOrSwapItem_UserId(userId, userId);
                if (t3 != null) relatedTransactions.addAll(t3);
            } catch (Exception ignored) {}

            // Collect transaction ids
            List<Long> txIds = relatedTransactions.stream().map(Transaction::getId).collect(Collectors.toList());

            // 2) Delete ratings associated with those transactions first to satisfy FK constraints
            if (!txIds.isEmpty()) {
                ratingRepository.deleteAllByTransactionIdIn(txIds);
            }

            // 3) Delete the transactions themselves
            if (!relatedTransactions.isEmpty()) {
                transactionRepository.deleteAll(relatedTransactions);
            }

            // 4) Delete ratings where the user is rater or rated user
            try {
                ratingRepository.deleteByRaterId(userId);
            } catch (Exception ignored) {}
            try {
                ratingRepository.deleteByRatedUserId(userId);
            } catch (Exception ignored) {}

            // 5) Delete messages sent by the user
            try {
                messageRepository.deleteBySenderId(userId);
            } catch (Exception ignored) {}

            // 6) Delete all chat rooms and messages where the user is a participant or where item owned by user
            try {
                List<ChatRoom> userChatRooms = chatRoomRepository.findByItem_UserIdOrParticipantId(userId, userId);
                for (ChatRoom chatRoom : userChatRooms) {
                    // Delete all messages in the chat room first
                    try { messageRepository.deleteByChatRoomId(chatRoom.getId()); } catch (Exception ignored) {}
                    try { chatRoomRepository.delete(chatRoom); } catch (Exception ignored) {}
                }
            } catch (Exception ignored) {}

            // 7) Delete notifications
            try { notificationRepository.deleteByUserId(userId); } catch (Exception ignored) {}

            // 8) Delete items owned by user (after deleting transactions/messages/rooms related to them)
            try {
                Page<Item> userItems = itemRepository.findByUserId(userId, PageRequest.of(0, Integer.MAX_VALUE));
                for (Item item : userItems) {
                    try { chatRoomRepository.deleteMessagesByItemId(item.getId()); } catch (Exception ignored) {}
                    try { chatRoomRepository.deleteByItemId(item.getId()); } catch (Exception ignored) {}
                    try { itemRepository.delete(item); } catch (Exception ignored) {}
                }
            } catch (Exception ignored) {}

            // 9) Finally delete the user record
            userRepository.delete(user);

            return ResponseEntity.ok().build();
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
//            log.error("Error deleting user " + userId, e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Error deleting user: " + e.getMessage());
        }
    }

    // Update user details
    @PutMapping("/users/{id}")
    public ResponseEntity<?> updateUser(
            @PathVariable Long id,
            @RequestBody Map<String, Object> updates) {

        return userRepository.findById(id)
                .map(user -> {
                    try {
                        // Update name if provided
                        if (updates.containsKey("name")) {
                            user.setName((String) updates.get("name"));
                        }

                        // Update email if provided
                        if (updates.containsKey("email")) {
                            String email = (String) updates.get("email");
                            if (!user.getEmail().equals(email) && userRepository.existsByEmail(email)) {
                                throw new IllegalArgumentException("Email already in use");
                            }
                            user.setEmail(email);
                        }

                        // Update role if provided
                        if (updates.containsKey("role")) {
                            try {
                                UserRole role = UserRole.valueOf(((String) updates.get("role")).toUpperCase());
                                user.setRole(role);
                            } catch (IllegalArgumentException e) {
                                throw new IllegalArgumentException("Invalid role provided");
                            }
                        }

                        userRepository.save(user);

                        Map<String, Object> response = new HashMap<>();
                        response.put("message", "User updated successfully");
                        response.put("user", user);
                        return ResponseEntity.ok(response);

                    } catch (IllegalArgumentException e) {
                        Map<String, String> error = new HashMap<>();
                        error.put("error", e.getMessage());
                        return ResponseEntity.badRequest().body(error);
                    } catch (Exception e) {
                        Map<String, String> error = new HashMap<>();
                        error.put("error", "Failed to update user: " + e.getMessage());
                        return ResponseEntity.badRequest().body(error);
                    }
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Admin Dashboard Endpoints

    /**
     * Get dashboard statistics for admin
     */
    @GetMapping("/dashboard/stats")
    public ResponseEntity<?> getDashboardStats() {
        try {
            DashboardStats stats = dashboardService.getDashboardStats();
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            log.log(Level.SEVERE, "Error fetching dashboard stats", e);
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to load dashboard stats: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    // Item Management Endpoints

    /**
     * Get all items with pagination and search
     */
    @GetMapping("/items")
    public ResponseEntity<PaginatedResponse<ItemResponseDto>> getItems(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam(required = false) String search) {

        try {
            Pageable pageable = PageRequest.of(
                    page,
                    size,
                    Sort.by(Sort.Direction.fromString(sortDir.toUpperCase()), sortBy)
            );

            Page<Item> itemsPage;
            Page<ItemResponseDto> dtoPage;

            if (search != null && !search.isEmpty()) {
                itemsPage = itemRepository.findByTitleContainingIgnoreCaseOrDescriptionContainingIgnoreCase(
                        search, search, pageable);
            } else {
                itemsPage = itemRepository.findAll(pageable);
            }
            
            // Convert to DTOs
            dtoPage = itemsPage.map(ItemResponseDto::fromEntity);

            PaginatedResponse<ItemResponseDto> response = new PaginatedResponse<>(
                    dtoPage.getContent(),
                    dtoPage.getNumber(),
                    dtoPage.getSize(),
                    dtoPage.getTotalElements(),
                    dtoPage.getTotalPages()
            );

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.severe("Error fetching items: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get item by ID
     */
    @GetMapping("/items/{id}")
    public ResponseEntity<ItemResponseDto> getItemById(@PathVariable Long id) {
        return itemRepository.findById(id)
                .map(ItemResponseDto::fromEntity)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Update item status (active/inactive)
     */
    @PutMapping("/items/{id}/status")
    public ResponseEntity<?> updateItemStatus(
            @PathVariable Long id,
            @RequestBody Map<String, Boolean> statusRequest) {

        return itemRepository.findById(id)
                .map(item -> {
                    try {
                        Boolean active = statusRequest.get("active");
                        if (active == null) {
                            throw new IllegalArgumentException("Active status is required");
                        }

                        // If item was deleted (soft-delete), disallow re-enabling
                        if (Boolean.TRUE.equals(item.getDeleted()) && Boolean.TRUE.equals(active)) {
                            Map<String, String> error = new HashMap<>();
                            error.put("error", "Item has been deleted and cannot be enabled");
                            return ResponseEntity.badRequest().body(error);
                        }

                        item.setActive(String.valueOf(active));
                        Item updatedItem = itemRepository.save(item);

                        Map<String, Object> response = new HashMap<>();
                        response.put("message", "Item status updated successfully");
                        response.put("active", active);
                        response.put("itemId", updatedItem.getId());
                        return ResponseEntity.ok(response);

                    } catch (Exception e) {
                        log.severe("Error updating item status: " + e.getMessage());
                        Map<String, String> error = new HashMap<>();
                        error.put("error", "Failed to update item status: " + e.getMessage());
                        return ResponseEntity.badRequest().body(error);
                    }
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Delete an item
     */
    @DeleteMapping("/items/{id}")
    public ResponseEntity<?> deleteItem(@PathVariable Long id) {
        try {
            // Delegate to ItemService admin delete which handles removing dependent entities safely
            itemService.deleteItemAsAdmin(id);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Item deleted successfully");
            return ResponseEntity.ok(response);
        } catch (ResponseStatusException rse) {
            // This preserves 404 semantics from the service
            throw rse;
        } catch (SecurityException se) {
            Map<String, String> err = new HashMap<>();
            err.put("error", se.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(err);
        } catch (Exception e) {
            log.severe("Error deleting item: " + e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to delete item: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

}
