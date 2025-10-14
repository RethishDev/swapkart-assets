package com.service.impl;

import com.dto.RatingRequest;
import com.dto.RatingResponse;
import com.entity.*;
import com.entity.enums.TransactionStatus;
import com.exception.ResourceNotFoundException;
import com.exception.UnauthorizedException;
import com.repository.RatingRepository;
import com.repository.TransactionRepository;
import com.repository.UserRepository;
import com.service.RatingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RatingServiceImpl implements RatingService {

    private final RatingRepository ratingRepository;
    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;

    @Override
    @Transactional
    public RatingResponse createRating(RatingRequest request, Long raterId) {
        // Validate that the rater exists
        User rater = userRepository.findById(raterId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + raterId));

        // Validate that the rated user exists
        User ratedUser = userRepository.findById(request.getRatedUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Rated user not found with id: " + request.getRatedUserId()));

        // Validate that the transaction exists and involves both users
        Transaction transaction = null;
        if (request.getTransactionId() != null) {
            transaction = transactionRepository.findById(request.getTransactionId())
                    .orElseThrow(() -> new ResourceNotFoundException("Transaction not found with id: " + request.getTransactionId()));

            // Verify that the rater is part of this transaction
            if (!transaction.getBuyer().getId().equals(raterId) &&
                !transaction.getItem().getUser().getId().equals(raterId)) {
                throw new UnauthorizedException("You are not authorized to rate this transaction");
            }
        }

        // Check if the user has already rated
        if (ratingRepository.existsByRaterIdAndRatedUserId(raterId, request.getRatedUserId())) {
            throw new IllegalStateException("You have already rated this user");
        }

        // Create and save the rating
        Rating rating = Rating.builder()
                .rater(rater)
                .ratedUser(ratedUser)
                .transaction(transaction)
                .score(request.getScore())
                .comment(request.getComment())
                .build();

        Rating savedRating = ratingRepository.save(rating);
        return RatingResponse.fromEntity(savedRating);
    }

    @Override
    @Transactional
    public RatingResponse updateRating(Long ratingId, RatingRequest request, Long raterId) {
        Rating rating = ratingRepository.findById(ratingId)
                .orElseThrow(() -> new ResourceNotFoundException("Rating not found with id: " + ratingId));

        // Check if the current user is the rater
        if (!rating.getRater().getId().equals(raterId)) {
            throw new UnauthorizedException("You are not authorized to update this rating");
        }

        // Update the rating
        rating.setScore(request.getScore());
        rating.setComment(request.getComment());

        Rating updatedRating = ratingRepository.save(rating);
        return RatingResponse.fromEntity(updatedRating);
    }

    @Override
    @Transactional
    public void deleteRating(Long ratingId, Long userId) {
        Rating rating = ratingRepository.findById(ratingId)
                .orElseThrow(() -> new ResourceNotFoundException("Rating not found with id: " + ratingId));

        // Check if the current user is the rater or an admin
        if (!rating.getRater().getId().equals(userId)) {
            throw new UnauthorizedException("You are not authorized to delete this rating");
        }

        ratingRepository.delete(rating);
    }

    @Override
    public RatingResponse getRatingById(Long ratingId) {
        Rating rating = ratingRepository.findById(ratingId)
                .orElseThrow(() -> new ResourceNotFoundException("Rating not found with id: " + ratingId));
        return RatingResponse.fromEntity(rating);
    }

    @Override
    public List<RatingResponse> getRatingsByUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        return ratingRepository.findByRater(user).stream()
                .map(RatingResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    public List<RatingResponse> getRatingsForUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        return ratingRepository.findByRatedUser(user).stream()
                .map(RatingResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    public Double getUserAverageRating(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException("User not found with id: " + userId);
        }

        Double average = ratingRepository.findAverageRatingByRatedUserId(userId);
        return average != null ? Math.round(average * 10.0) / 10.0 : 0.0; // Round to 1 decimal place
    }

    @Override
    public int getUserRatingCount(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException("User not found with id: " + userId);
        }

        return ratingRepository.countByRatedUserId(userId);
    }

    @Override
    public boolean hasUserRated(Long raterId, Long ratedUserId) {
        return ratingRepository.existsByRaterIdAndRatedUserId(raterId, ratedUserId);
    }
    
    @Override
    public RatingResponse getRatingByTransaction(Long transactionId) {
        Rating rating = ratingRepository.findByTransactionId(transactionId)
                .orElseThrow(() -> new ResourceNotFoundException("Rating not found for transaction: " + transactionId));
        return RatingResponse.fromEntity(rating);
    }
    
    @Override
    @Transactional(readOnly = true)
    public boolean isTransactionEligibleForRating(Long transactionId, Long userId) {
        // Get the transaction
        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found with id: " + transactionId));
        
        // Check if the user is the buyer of this transaction
        if (!transaction.getBuyer().getId().equals(userId)) {
            return false;
        }
        
        // Check if the transaction is in a rateable state (ACCEPTED or COMPLETED)
        if (transaction.getStatus() != TransactionStatus.ACCEPTED && 
            transaction.getStatus() != TransactionStatus.COMPLETED) {
            return false;
        }
        
        // Check if the user has already rated this transaction
        return !ratingRepository.existsByTransactionIdAndRaterId(transactionId, userId);
    }
    
    @Override
    @Transactional
    public RatingResponse rateTransaction(Long transactionId, RatingRequest request, Long userId) {
        // Get the transaction
        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found with id: " + transactionId));
        
        // Verify the user is the buyer of this transaction
        if (!transaction.getBuyer().getId().equals(userId)) {
            throw new UnauthorizedException("Only the buyer can rate this transaction");
        }
        
        // Verify the transaction is in a rateable state
        if (transaction.getStatus() != TransactionStatus.ACCEPTED && 
            transaction.getStatus() != TransactionStatus.COMPLETED) {
            throw new IllegalStateException("This transaction cannot be rated in its current state");
        }
        
        // Check if the user has already rated this transaction
        Rating existingRating = ratingRepository.findByTransactionIdAndRaterId(transactionId, userId)
                .orElse(null);
        
        if (existingRating != null) {
            // Update existing rating
            existingRating.setScore(request.getScore());
            existingRating.setComment(request.getComment());
            Rating updatedRating = ratingRepository.save(existingRating);
            return RatingResponse.fromEntity(updatedRating);
        } else {
            // Create new rating
            User seller = transaction.getItem().getUser();
            
            Rating rating = Rating.builder()
                    .rater(transaction.getBuyer())
                    .ratedUser(seller)
                    .transaction(transaction)
                    .score(request.getScore())
                    .comment(request.getComment())
                    .build();
            
            Rating savedRating = ratingRepository.save(rating);
            return RatingResponse.fromEntity(savedRating);
        }
    }
}
