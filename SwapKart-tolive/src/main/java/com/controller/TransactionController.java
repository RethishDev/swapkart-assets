package com.controller;

import com.dto.TransactionRequestDTO;
import com.dto.TransactionResponseDTO;
import com.entity.Item;
import com.entity.Transaction;
import com.entity.User;
import com.entity.enums.TransactionStatus;
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
        if (transaction == null) return dto;

        dto.setId(transaction.getId());

        Item item = transaction.getItem();
        if (item != null) {
            dto.setItemId(item.getId());
            dto.setItemName(item.getTitle());
            dto.setItemDescription(item.getDescription());
            dto.setItemImage(item.getImageUrls() != null && !item.getImageUrls().isEmpty()
                    ? item.getImageUrls().get(0)
                    : null);
            dto.setAmount(item.getPrice() != null ? item.getPrice().longValue() : 0L);

            User seller = item.getUser();
            if (seller != null) {
                dto.setSellerId(seller.getId());
                dto.setSellerName(seller.getName());
                dto.setSellerEmail(seller.getEmail());
                dto.setSellerPhone(seller.getMobile());
            }
        } else {
            dto.setAmount(0L);
        }

        User buyer = transaction.getBuyer();
        if (buyer != null) {
            dto.setBuyerId(buyer.getId());
            dto.setBuyerName(buyer.getName());
            dto.setBuyerEmail(buyer.getEmail());
            dto.setBuyerPhone(buyer.getMobile());
        }

        dto.setType(transaction.getType());
        dto.setStatus(transaction.getStatus() != null ? transaction.getStatus().name() : null);
        dto.setMessage(transaction.getMessage());
        dto.setCreatedAt(transaction.getCreatedAt());
        dto.setUpdatedAt(transaction.getUpdatedAt());

        if (transaction.getSwapItem() != null) {
            dto.setSwapItemId(transaction.getSwapItem().getId());
            dto.setSwapItemName(transaction.getSwapItem().getTitle());
        }

        return dto;
    }
}