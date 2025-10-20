package com.dto;

import com.entity.enums.TransactionType;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

 @Data
@Getter
@Setter
public class TransactionResponseDTO {
    private Long id;
    private Long itemId;
    private String itemName;
    private String itemDescription;
    private String itemImage;
    private Long amount;
    private Long sellerId;
    private String sellerName;
    private String sellerEmail;
    private String sellerPhone;
    private Long buyerId;
    private String buyerName;
    private String buyerEmail;
    private String buyerPhone;
    @NotBlank(message = "Transaction type is required")
    private TransactionType type;
    private String status; // PENDING, ACCEPTED, REJECTED, COMPLETED
    private String message;
    private Long swapItemId;
    private String swapItemName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}