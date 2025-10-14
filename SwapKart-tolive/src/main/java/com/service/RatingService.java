package com.service;

import com.dto.RatingRequest;
import com.dto.RatingResponse;
import com.entity.Rating;

import java.util.List;

public interface RatingService {

    RatingResponse createRating(RatingRequest request, Long raterId);

    RatingResponse updateRating(Long ratingId, RatingRequest request, Long raterId);

    void deleteRating(Long ratingId, Long userId);

    RatingResponse getRatingById(Long ratingId);

    List<RatingResponse> getRatingsByUser(Long userId);

    List<RatingResponse> getRatingsForUser(Long userId);

    Double getUserAverageRating(Long userId);

    int getUserRatingCount(Long userId);

    boolean hasUserRated(Long raterId, Long ratedUserId);

    RatingResponse getRatingByTransaction(Long transactionId);
    
    /**
     * Checks if a transaction is eligible for rating by the current user
     * @param transactionId The ID of the transaction
     * @param userId The ID of the current user
     * @return true if the transaction can be rated by the user, false otherwise
     */
    boolean isTransactionEligibleForRating(Long transactionId, Long userId);
    
    /**
     * Rates a transaction (rates the seller for the transaction)
     * @param transactionId The ID of the transaction being rated
     * @param request The rating details
     * @param userId The ID of the user submitting the rating (must be the buyer)
     * @return The created/updated rating response
     */
    RatingResponse rateTransaction(Long transactionId, RatingRequest request, Long userId);
}
