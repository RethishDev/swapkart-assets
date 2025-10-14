package com.controller;

import com.entity.Transaction;
import com.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/debug")
@RequiredArgsConstructor
public class DebugController {

    private final TransactionRepository transactionRepository;

    @GetMapping("/transaction/{id}")
    public ResponseEntity<?> checkTransaction(@PathVariable Long id) {
        System.out.println("Checking transaction with ID: " + id);
        return transactionRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> {
                    System.out.println("Transaction not found with ID: " + id);
                    return ResponseEntity.notFound().build();
                });
    }
}
