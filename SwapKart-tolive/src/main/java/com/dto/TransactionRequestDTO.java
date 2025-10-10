package com.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;


@Data
public class TransactionRequestDTO {
    @NotNull(message = "Item ID is required")
    private Long itemId;

    @NotBlank(message = "Transaction type is required")
    private String type; // BUY, REQUEST, SWAP

    private String message;
    private String deliveryAddress;
    private String contactNumber;
    private Long swapItemId; // Only for SWAP type
}