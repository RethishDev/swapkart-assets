package com.repository;

import com.entity.Transaction;
import com.entity.enums.TransactionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;
import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    
    @EntityGraph(attributePaths = {"item", "item.user", "buyer", "swapItem"})
    @Query("SELECT t FROM Transaction t WHERE t.id = :id")
    default Optional<Transaction> findByIdWithRelations(@Param("id") Long id) {
        System.out.println("TransactionRepository.findByIdWithRelations called with ID: " + id);
        Optional<Transaction> result = findByIdWithRelationsQuery(id);
        System.out.println("Transaction found: " + result.isPresent());
        result.ifPresent(t -> {
            System.out.println("Transaction details - ID: " + t.getId() + 
                             ", Buyer ID: " + (t.getBuyer() != null ? t.getBuyer().getId() : "null") +
                             ", Item ID: " + (t.getItem() != null ? t.getItem().getId() : "null"));
        });
        return result;
    }
    
    @EntityGraph(attributePaths = {"item", "item.user", "buyer", "swapItem"})
    @Query("SELECT t FROM Transaction t WHERE t.id = :id")
    Optional<Transaction> findByIdWithRelationsQuery(@Param("id") Long id);

    List<Transaction> findByBuyerId(Long buyerId);
    List<Transaction> findByItemUserId(Long userId);
    
    @EntityGraph(attributePaths = {"item", "item.user", "buyer", "swapItem"})
    List<Transaction> findByItemUserEmailAndStatus(String email, TransactionStatus status);
    
    @EntityGraph(attributePaths = {"item", "item.user", "buyer", "swapItem"})
    List<Transaction> findByBuyerEmailAndStatus(String email, TransactionStatus status);
    
    @EntityGraph(attributePaths = {"item", "item.user", "buyer", "swapItem"})
    List<Transaction> findByStatus(TransactionStatus status);
    
    @EntityGraph(attributePaths = {"item", "item.user", "buyer", "swapItem"})
    Page<Transaction> findAll(Pageable pageable);
    
    @EntityGraph(attributePaths = {"item", "item.user", "buyer", "swapItem"})
    Page<Transaction> findByStatus(TransactionStatus status, Pageable pageable);
    
    @EntityGraph(attributePaths = {"item", "item.user", "buyer", "swapItem"})
    Page<Transaction> findByItemUserEmail(String email, Pageable pageable);
    
    @EntityGraph(attributePaths = {"item", "item.user", "buyer", "swapItem"})
    Page<Transaction> findByItemUserEmailAndStatus(String email, TransactionStatus status, Pageable pageable);
    
    @EntityGraph(attributePaths = {"item", "item.user", "buyer", "swapItem"})
    Page<Transaction> findByBuyerEmail(String email, Pageable pageable);
    
    @EntityGraph(attributePaths = {"item", "item.user", "buyer", "swapItem"})
    Page<Transaction> findByBuyerEmailAndStatus(String email, TransactionStatus status, Pageable pageable);
    
    /**
     * Counts the number of transactions with a specific status
     * @param status The status to filter by
     * @return The count of transactions with the given status
     */
    @Query("SELECT COUNT(t) FROM Transaction t WHERE t.status = :status")
    long countByStatus(@Param("status") TransactionStatus status);

    List<Transaction> findByItemIdOrSwapItemId(Long itemId, Long swapItemId);
    
    @Query("SELECT t FROM Transaction t WHERE t.item.user.id = :userId OR t.swapItem.user.id = :userId")
    List<Transaction> findByItem_UserIdOrSwapItem_UserId(@Param("userId") Long userId, @Param("userId") Long userId2);

    @Query("SELECT t FROM Transaction t WHERE t.buyer.id = :buyerId OR t.item.user.id = :userId")
    List<Transaction> findByBuyerIdOrItem_UserId(@Param("buyerId") Long buyerId, @Param("userId") Long userId);
}