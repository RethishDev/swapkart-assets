package com.controller;

import com.dto.TransactionRequestDTO;
import com.dto.TransactionResponseDTO;
import com.entity.Transaction;
import com.entity.enums.TransactionStatus;
import com.service.TransactionService;
import com.service.impl.TransactionServiceImpl;
import jakarta.validation.Valid;
import jakarta.validation.ValidationException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionServiceImpl transactionService;

    // Admin endpoints
    @GetMapping("/admin")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<Page<TransactionResponseDTO>> getAllTransactions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt,desc") String[] sort) {

        String sortField = sort[0];
        String sortDirection = sort.length > 1 ? sort[1] : "desc";

        Sort.Direction direction = sortDirection.equalsIgnoreCase("asc") ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortField));

        Page<TransactionResponseDTO> transactions = transactionService.getAllTransactions(pageable);
        return ResponseEntity.ok(transactions);
    }

    @GetMapping("/admin/status/{status}")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<Page<TransactionResponseDTO>> getTransactionsByStatus(
            @PathVariable String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt,desc") String[] sort) {

        try {
            TransactionStatus statusEnum = TransactionStatus.valueOf(status.toUpperCase());
            String sortField = sort[0];
            String sortDirection = sort.length > 1 ? sort[1] : "desc";

            Sort.Direction direction = sortDirection.equalsIgnoreCase("asc") ? Sort.Direction.ASC : Sort.Direction.DESC;
            Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortField));

            Page<TransactionResponseDTO> transactions = transactionService.getTransactionsByStatus(statusEnum, pageable);
            return ResponseEntity.ok(transactions);
        } catch (IllegalArgumentException e) {
            throw new ValidationException("Invalid status value: " + status +
                    ". Must be one of: " + Arrays.toString(TransactionStatus.values()));
        }
    }

    @PostMapping
    public ResponseEntity<TransactionResponseDTO> createTransaction(
            @Valid @RequestBody TransactionRequestDTO request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String userEmail = userDetails.getUsername();
        return ResponseEntity.ok(transactionService.createTransaction(userEmail, request));
    }

    @GetMapping("/received")
    public ResponseEntity<List<TransactionResponseDTO>> getReceivedTransactions(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String status) {
        String userEmail = userDetails.getUsername();
        List<TransactionResponseDTO> transactions;

        if (status != null && !status.isEmpty()) {
            try {
                TransactionStatus statusEnum = TransactionStatus.valueOf(status.toUpperCase());
                transactions = transactionService.getReceivedTransactionsByStatus(userEmail, statusEnum)
                        .stream()
                        .map(this::convertToDTO)
                        .collect(Collectors.toList());
            } catch (IllegalArgumentException e) {
                throw new ValidationException("Invalid status value: " + status +
                        ". Must be one of: " + Arrays.toString(TransactionStatus.values()));
            }
        } else {
            transactions = transactionService.getReceivedTransactions(userEmail);
        }

        return ResponseEntity.ok(transactions);
    }

    @GetMapping("/sent")
    public ResponseEntity<List<TransactionResponseDTO>> getSentTransactions(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String status) {
        String userEmail = userDetails.getUsername();

        if (status != null && !status.isEmpty()) {
            try {
                TransactionStatus statusEnum = TransactionStatus.valueOf(status.toUpperCase());
                List<Transaction> transactions = transactionService.getSentTransactionsByStatus(userEmail, statusEnum);
                return ResponseEntity.ok(transactions.stream()
                        .map(this::convertToDTO)
                        .collect(Collectors.toList()));
            } catch (IllegalArgumentException e) {
                throw new ValidationException("Invalid status value: " + status +
                        ". Must be one of: " + Arrays.toString(TransactionStatus.values()));
            }
        } else {
            // getSentTransactions already returns DTOs, no need to convert
            return ResponseEntity.ok(transactionService.getSentTransactions(userEmail));
        }
    }

    @GetMapping("/{transactionId}")
    public ResponseEntity<TransactionResponseDTO> getTransactionById(
            @PathVariable Long transactionId,
            @AuthenticationPrincipal UserDetails userDetails) {
        String userEmail = userDetails.getUsername();
        return ResponseEntity.ok(transactionService.getTransactionById(userEmail, transactionId));
    }

    @PutMapping("/{transactionId}/status")
    public ResponseEntity<TransactionResponseDTO> updateTransactionStatus(
            @PathVariable Long transactionId,
            @RequestParam String status,
            @AuthenticationPrincipal UserDetails userDetails) {
        String userEmail = userDetails.getUsername();
        return ResponseEntity.ok(transactionService.updateTransactionStatus(userEmail, transactionId, status));
    }

    private TransactionResponseDTO convertToDTO(Transaction transaction) {
        TransactionResponseDTO dto = new TransactionResponseDTO();
        dto.setId(transaction.getId());
        dto.setItemId(transaction.getItem().getId());
        dto.setItemName(transaction.getItem().getTitle());
        dto.setItemDescription(transaction.getItem().getDescription());
        dto.setItemImage(String.valueOf(transaction.getItem().getImageUrls()));
        dto.setSellerId(transaction.getBuyer().getId());
        dto.setBuyerId(transaction.getBuyer().getId());
        dto.setStatus(transaction.getStatus().name());
        dto.setCreatedAt(transaction.getCreatedAt());
        dto.setUpdatedAt(transaction.getUpdatedAt());
        dto.setType(transaction.getType());

        return dto;
    }
}