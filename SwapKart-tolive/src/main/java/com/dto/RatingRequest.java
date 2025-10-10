package com.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class RatingRequest {

    @NotNull(message = "Rated user ID is required")
    private Long ratedUserId;

    @NotNull(message = "Transaction ID is required")
    private Long transactionId;

    @NotNull(message = "Rating score is required")
    @Min(value = 1, message = "Rating must be at least 1")
    @Max(value = 5, message = "Rating cannot be more than 5")
    private Integer score;

    @Size(max = 500, message = "Comment cannot exceed 500 characters")
    private String comment;
}
