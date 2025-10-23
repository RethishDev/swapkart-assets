package com.service;

import com.dto.ItemCountsDTO;
import com.dto.ItemRequest;
import com.dto.ItemResponseDto;
import com.entity.*;
import com.entity.ItemType;
import com.entity.enums.ItemStatus;
import com.entity.enums.TransactionStatus;
import com.exception.ResourceNotFoundException;
import com.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.modelmapper.ModelMapper;

@Service
@RequiredArgsConstructor
@Slf4j
public class ItemService {

    private final ItemRepository itemRepo;
    private final UserRepository userRepo;
    private final TransactionRepository transactionRepo;
    private final ModelMapper modelMapper;
    private final ChatRoomRepository chatRoomRepository;
    private final RatingRepository ratingRepository;

    // Injecting value from properties
    @Value("${file.upload-dir}")
    private String uploadDir;

    @Transactional
    public Item addItem(ItemRequest request, MultipartFile[] images) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepo.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (request.getPrice() != null && request.getType() == ItemType.SELL) {
            request.setPrice(request.getPrice());
        } else {
            request.setPrice(null);
        }

        // Create item with all fields including condition and price
        Item item = Item.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .type(request.getType())
                .category(request.getCategory())
                .city(request.getCity())
                .pincode(request.getPincode())
                .price(request.getPrice())
                .status(request.getStatus() != null ? request.getStatus() : ItemStatus.AVAILABLE)
                .itemCondition(request.getCondition())
                .user(user)
                .active("true")
                .build();

        // Ensure status is not null
        if (item.getStatus() == null) {
            item.setStatus(ItemStatus.AVAILABLE);
        }

        if (images != null && images.length > 0) {
            try {
                MultipartFile firstImage = images[0];

                if (!firstImage.isEmpty()) {
                    Path uploadPath = Paths.get(uploadDir);
                    Files.createDirectories(uploadPath); // This will create the full path if it doesn't exist

                    String fileName = UUID.randomUUID() + "_" + firstImage.getOriginalFilename();
                    Path filePath = uploadPath.resolve(fileName);
                    firstImage.transferTo(filePath.toFile());

                    item.setImageUrls(List.of("/uploads/items/" + fileName));
                }
            } catch (IOException e) {
                throw new RuntimeException("Error saving image", e);
            }
        }

        return itemRepo.save(item);
    }

    public Item getItemById(Long id) {
        return itemRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Item not found with id: " + id));
    }

    @Transactional
    public Item updateItem(Long id, ItemRequest request) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        Item existingItem = itemRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Item not found with id: " + id));

        // Verify that the current user is the owner of the item
        if (!existingItem.getUser().getEmail().equals(email)) {
            throw new SecurityException("You are not authorized to update this item");
        }

        existingItem.setTitle(request.getTitle());
        existingItem.setDescription(request.getDescription());
        existingItem.setType(request.getType());
        existingItem.setCategory(request.getCategory());
        existingItem.setCity(request.getCity());
        existingItem.setPincode(request.getPincode());
        existingItem.setItemCondition(request.getCondition() != null ? request.getCondition() : "Not specified");
        existingItem.setPrice(request.getPrice());

        // Add new image URL if provided
        if (request.getImageUrl() != null && !request.getImageUrl().isEmpty()) {
            existingItem.addImageUrl(request.getImageUrl());
        }

        return itemRepo.save(existingItem);
    }

    @Transactional
    public void deleteItem(Long id) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        Item item = itemRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Item not found with id: " + id));

        // Verify that the current user is the owner of the item
        if (!item.getUser().getEmail().equals(email)) {
            throw new SecurityException("You are not authorized to delete this item");
        }

        try {
            // Soft-delete the item as a user: mark deleted=true and ensure deletedByAdmin=false
            item.setActive(String.valueOf(false));
            item.setAvailable(false);
            item.setDeleted(true);
            item.setDeletedByAdmin(false);
            itemRepo.save(item);
        } catch (Exception e) {
            log.error("Error deleting item with id: " + id, e);
            throw new RuntimeException("Failed to delete item: " + e.getMessage(), e);
        }
    }

    /**
     * Admin delete: deletes an item and dependencies without ownership checks.
     */
    @Transactional
    public void deleteItemAsAdmin(Long id) {
        Item item = itemRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Item not found with id: " + id));

        try {
            // Admin soft-delete: mark deleted=true and deletedByAdmin=true
            item.setActive(String.valueOf(false));
            item.setAvailable(false);
            item.setDeleted(true);
            item.setDeletedByAdmin(true);
            itemRepo.save(item);
        } catch (Exception e) {
            log.error("Error deleting item with id: " + id, e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to delete item: " + e.getMessage(), e);
        }
    }

    @Transactional
    public void addImageToItem(Long itemId, String imageUrl) {
        Item item = getItemById(itemId);
        item.addImageUrl(imageUrl);
        itemRepo.save(item);
    }

    @Transactional
    public void removeImageFromItem(Long itemId, String imageUrl) {
        Item item = getItemById(itemId);
        item.removeImageUrl(imageUrl);
        itemRepo.save(item);
    }

    @Transactional
    public void toggleItemAvailability(Long itemId) {
        Item item = getItemById(itemId);
        item.setAvailable(!item.getAvailable());
        itemRepo.save(item);
    }

    // Paginated methods
    public Page<Item> getAllItems(Pageable pageable) {
        return itemRepo.findAll(pageable);
    }

    public Page<Item> searchItems(String query, String city, String category, ItemType type, Pageable pageable) {
        // Start with the base query for available items
        Specification<Item> spec = (root, q, cb) -> cb.isTrue(root.get("available"));

        // Add filters dynamically based on presence
        if (query != null && !query.isEmpty()) {
            spec = spec.and((root, q, cb) -> cb.or(
                    cb.like(cb.lower(root.get("title")), "%" + query.toLowerCase() + "%"),
                    cb.like(cb.lower(root.get("description")), "%" + query.toLowerCase() + "%")
            ));
        }

        if (city != null && !city.isEmpty()) {
            spec = spec.and((root, q, cb) -> cb.equal(cb.lower(root.get("city")), city.toLowerCase()));
        }

        if (category != null && !category.isEmpty()) {
            spec = spec.and((root, q, cb) -> cb.equal(cb.lower(root.get("category")), category.toLowerCase()));
        }

        if (type != null) {
            spec = spec.and((root, q, cb) -> cb.equal(root.get("type"), type));
        }

        return itemRepo.findAll(spec, pageable);
    }
//    public Page<Item> searchItems(String query, String city, String category, ItemType type, Pageable pageable) {
//        if (query != null && !query.isEmpty()) {
//            return itemRepo.searchByTitleOrDescriptionAndIsAvailableTrue(query, pageable);
//        }
//
//        if (city != null && !city.isEmpty()) {
//            return itemRepo.findByCityIgnoreCaseAndIsAvailableTrue(city, pageable);
//        }
//
//        if (category != null && !category.isEmpty()) {
//            return itemRepo.findByCategoryIgnoreCaseAndIsAvailableTrue(category, pageable);
//        }
//
//        if (type != null) {
//            return itemRepo.findByTypeAndIsAvailableTrue(type, pageable);
//        }
//
//        return itemRepo.findByIsAvailableTrue(pageable);
//    }

    // Helper methods for controller
    public List<String> getItemImages(Long itemId) {
        Item item = getItemById(itemId);
        return item.getImageUrls();
    }

    public boolean doesUserOwnItem(String email, Long itemId) {
        return itemRepo.existsByIdAndUserEmail(itemId, email);
    }

    public Page<Item> getCurrentUserItems(Pageable pageable) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        // Use the repository method that hides user-deleted items but includes admin-deleted ones
        return itemRepo.findVisibleByUserEmail(email, pageable);
    }

    public Page<Item> getItemsByUser(Long userId, Pageable pageable) {
        return itemRepo.findByUserId(userId, pageable);
    }

    public List<String> getAllCategories() {
        return itemRepo.findAllCategories();
    }

    public List<String> getAllCities() {
        return itemRepo.findAllCities();
    }

    public long getCurrentUserItemCount() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return itemRepo.countByUserEmail(email);
    }
    public long getTotalItemCount() {
        try {
            System.out.println("Getting total item count from repository...");
            long count = itemRepo.count();
            System.out.println("Successfully retrieved item count: " + count);
            return count;
        } catch (Exception e) {
            System.err.println("Error getting total item count: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to get total item count: " + e.getMessage(), e);
        }
    }

    @Transactional(readOnly = true)
    public List<ItemResponseDto> getUserItems(Long userId) {
        return itemRepo.findByUserIdAndStatus(userId, ItemStatus.AVAILABLE)
                .stream()
                .map(item -> modelMapper.map(item, ItemResponseDto.class))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ItemCountsDTO getItemCountsByType() {
        try {
            log.info("Fetching item counts by type...");
            
            // Get item counts by type
            long swapCount = itemRepo.countByType(ItemType.SWAP);
            long saleCount = itemRepo.countByType(ItemType.SELL);
            long donateCount = itemRepo.countByType(ItemType.DONATE);
            
            // Get active trades count (transactions with PENDING status)
            long activeTrades = transactionRepo.countByStatus(TransactionStatus.PENDING);
            // Get available items count
            long availableCount = itemRepo.countByAvailable(true);
            
            log.info("Counts - SWAP: {}, SELL: {}, DONATE: {}, Active Trades: {}",
                    swapCount, saleCount, donateCount, activeTrades);

            // Create and return DTO with all counts
            return new ItemCountsDTO(swapCount, saleCount, donateCount, activeTrades, availableCount);
        } catch (Exception e) {
            log.error("Error getting item counts by type", e);
            throw new RuntimeException("Failed to get item counts by type", e);
        }
    }

}