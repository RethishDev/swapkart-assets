package com.repository;

import com.entity.Item;
import com.entity.ItemType;
import com.entity.enums.ItemStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ItemRepository extends JpaRepository<Item, Long>, JpaSpecificationExecutor<Item> {

    List<Item> findByUserIdAndStatus(Long userId, ItemStatus status);

    /**
     * Find items by title or description containing search term (case-insensitive)
     */
    Page<Item> findByTitleContainingIgnoreCaseOrDescriptionContainingIgnoreCase(
            String title, String description, Pageable pageable);

    /**
     * Find active items
     */
    Page<Item> findByActiveTrue(Pageable pageable);

    /**
     * Find inactive items
     */
    Page<Item> findByActiveFalse(Pageable pageable);

    /**
     * Find items by category
     */
    Page<Item> findByCategory(String category, Pageable pageable);

    /**
     * Count active items
     */
    long countByActiveTrue();

    /**
     * Count inactive items
     */
    long countByActiveFalse();

    /**
     * Count items by category
     */
    long countByCategory(String category);

    boolean existsByIdAndUserEmail(Long id, String email);

    Page<Item> findByUserEmail(String email, Pageable pageable);

    @Query("SELECT DISTINCT i.category FROM Item i WHERE i.category IS NOT NULL")
    List<String> findAllCategories();

    @Query("SELECT DISTINCT i.city FROM Item i WHERE i.city IS NOT NULL")
    List<String> findAllCities();

    long countByUserEmail(String email);

    Page<Item> findByUserId(Long userId, Pageable pageable);

    long countByCreatedAtAfter(LocalDateTime date);

    /**
     * Count items created between two dates (inclusive)
     */
    long countByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    /**
     * Count items by active status
     * @param active status to count (as string: "true" or "false")
     * @return Count of items with the given active status
     */
    long countByActive(String active);
    
    /**
     * Count items by availability
     * @param isAvailable true for available items, false for unavailable
     * @return Count of items with the given availability
     */
    long countByAvailable(boolean isAvailable);

    @Query("SELECT COUNT(i) FROM Item i WHERE i.type = :type AND i.available = true")
    long countByType(@Param("type") ItemType type);

    /**
     * Find items for a user's "My Items" view where user-deleted items are hidden
     */
    @Query("SELECT i FROM Item i WHERE i.user.email = :email AND (i.deleted = false OR i.deletedByAdmin = true)")
    Page<Item> findVisibleByUserEmail(@Param("email") String email, Pageable pageable);
}