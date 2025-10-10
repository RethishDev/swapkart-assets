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
}
