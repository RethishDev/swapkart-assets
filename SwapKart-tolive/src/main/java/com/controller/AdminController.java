package com.controller;

import com.dto.DashboardStats;
import com.dto.PaginatedResponse;
import com.dto.ItemResponseDto;
import com.entity.Item;
import com.entity.User;
import com.entity.UserRole;
import com.repository.ItemRepository;
import com.repository.UserRepository;
import com.service.DashboardService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.logging.Logger;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
public class AdminController {

    private final UserRepository userRepository;
    private final ItemRepository itemRepository;
    private final DashboardService dashboardService;
    private final Logger log = Logger.getLogger(AdminController.class.getName());

    // Constructor injection
    public AdminController(UserRepository userRepository, ItemRepository itemRepository, DashboardService dashboardService) {
        this.userRepository = userRepository;
        this.itemRepository = itemRepository;
        this.dashboardService = dashboardService;
    }

    // Get all users with pagination and filtering
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

        if (search != null && !search.isEmpty()) {
            usersPage = userRepository.findByEmailContainingIgnoreCaseOrNameContainingIgnoreCase(
                    search, search, pageable);
        } else {
            usersPage = userRepository.findAll(pageable);
        }

        PaginatedResponse<User> response = new PaginatedResponse<>(
                usersPage.getContent(),
                usersPage.getNumber(),
                usersPage.getSize(),
                usersPage.getTotalElements(),
                usersPage.getTotalPages()
        );

        return ResponseEntity.ok(response);
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

    // Delete user
    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(user -> {
                    try {
                        userRepository.delete(user);
                        Map<String, String> response = new HashMap<>();
                        response.put("message", "User deleted successfully");
                        return ResponseEntity.ok(response);
                    } catch (Exception e) {
                        Map<String, String> error = new HashMap<>();
                        error.put("error", "Failed to delete user: " + e.getMessage());
                        return ResponseEntity.badRequest().body(error);
                    }
                })
                .orElse(ResponseEntity.notFound().build());
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
        return itemRepository.findById(id)
                .map(item -> {
                    try {
                        itemRepository.delete(item);
                        Map<String, String> response = new HashMap<>();
                        response.put("message", "Item deleted successfully");
                        return ResponseEntity.ok(response);
                    } catch (Exception e) {
                        log.severe("Error deleting item: " + e.getMessage());
                        Map<String, String> error = new HashMap<>();
                        error.put("error", "Failed to delete item: " + e.getMessage());
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
                    }
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/dashboard/stats")
    public ResponseEntity<DashboardStats> getDashboardStats() {
        return ResponseEntity.ok(dashboardService.getDashboardStats());
    }
}