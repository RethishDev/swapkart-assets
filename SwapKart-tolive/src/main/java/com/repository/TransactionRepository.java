package com.repository;

import com.entity.Transaction;
import com.entity.enums.TransactionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.domain.Pageable;
import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {
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
}