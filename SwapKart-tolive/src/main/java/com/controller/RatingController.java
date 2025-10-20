package com.controller;

import com.dto.RatingRequest;
import com.dto.RatingResponse;
import com.entity.Rating;
import com.entity.Transaction;
import com.entity.User;
import com.exception.ResourceNotFoundException;
import com.repository.RatingRepository;
import com.repository.TransactionRepository;
import com.repository.UserRepository;
import com.service.RatingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/ratings")
@RequiredArgsConstructor
public class RatingController {
    private final RatingService ratingService;
    private final RatingRepository ratingRepository;
    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;

    @PostMapping
    public ResponseEntity<RatingResponse> createRating(
            @Valid @RequestBody RatingRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        Long userId = Long.parseLong(userDetails.getUsername());
        RatingResponse response = ratingService.createRating(request, userId);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<RatingResponse> updateRating(
            @PathVariable Long id,
            @Valid @RequestBody RatingRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        Long userId = Long.parseLong(userDetails.getUsername());
        RatingResponse response = ratingService.updateRating(id, request, userId);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRating(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        Long userId = Long.parseLong(userDetails.getUsername());
        ratingService.deleteRating(id, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}")
    public ResponseEntity<RatingResponse> getRatingById(@PathVariable Long id) {
        RatingResponse response = ratingService.getRatingById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<RatingResponse>> getRatingsByUser(@PathVariable Long userId) {
        List<RatingResponse> ratings = ratingService.getRatingsByUser(userId);
        return ResponseEntity.ok(ratings);
    }

    @GetMapping("/for-user/{userId}")
    public ResponseEntity<List<RatingResponse>> getRatingsForUser(@PathVariable Long userId) {
        List<RatingResponse> ratings = ratingService.getRatingsForUser(userId);
        return ResponseEntity.ok(ratings);
    }

    @GetMapping("/user/{userId}/average")
    public ResponseEntity<Double> getUserAverageRating(@PathVariable Long userId) {
        Double average = ratingService.getUserAverageRating(userId);
        return ResponseEntity.ok(average);
    }

    @GetMapping("/user/{userId}/count")
    public ResponseEntity<Integer> getUserRatingCount(@PathVariable Long userId) {
        int count = ratingService.getUserRatingCount(userId);
        return ResponseEntity.ok(count);
    }

    // Compatibility endpoints for frontend expecting /api/ratings/seller/* paths
    @GetMapping("/seller/{userId}/summary")
    public ResponseEntity<Map<String, Object>> getSellerSummary(@PathVariable Long userId) {
        Double average = ratingService.getUserAverageRating(userId);
        int ratingCount = ratingService.getUserRatingCount(userId);
        Map<String, Object> response = new HashMap<>();
        response.put("averageRating", average != null ? average : 0.0);
        response.put("ratingCount", ratingCount);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/seller/{userId}/reviews")
    public ResponseEntity<List<RatingResponse>> getSellerReviews(
            @PathVariable Long userId,
            @RequestParam(value = "size", required = false) Integer size) {
        List<RatingResponse> reviews = ratingService.getRatingsForUser(userId);
        if (reviews == null) reviews = List.of();
        if (size != null && size > 0 && reviews.size() > size) {
            reviews = reviews.subList(0, size);
        }
        return ResponseEntity.ok(reviews);
    }

    // Additional compatibility endpoints expected by some frontend scripts
    @GetMapping("/seller/{userId}/average")
    public ResponseEntity<Double> getSellerAverage(@PathVariable Long userId) {
        Double average = ratingService.getUserAverageRating(userId);
        return ResponseEntity.ok(average != null ? average : 0.0);
    }

    @GetMapping("/seller/{userId}/count")
    public ResponseEntity<Integer> getSellerRatingCount(@PathVariable Long userId) {
        int count = ratingService.getUserRatingCount(userId);
        return ResponseEntity.ok(count);
    }

    @GetMapping("/check-rating/{ratedUserId}")
    public ResponseEntity<Boolean> hasUserRated(
            @PathVariable Long ratedUserId,
            @AuthenticationPrincipal UserDetails userDetails) {
        Long raterId = Long.parseLong(userDetails.getUsername());
        boolean hasRated = ratingService.hasUserRated(raterId, ratedUserId);
        return ResponseEntity.ok(hasRated);
    }

    @GetMapping("/user-rating")
    public ResponseEntity<Map<String, Object>> getCurrentUserRatingStats(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @AuthenticationPrincipal UserDetails userDetails) {

        System.out.println("Authorization Header: " + (authHeader != null ? authHeader.substring(0, Math.min(20, authHeader.length())) + "..." : "null"));

        if (userDetails == null) {
            System.out.println("User not authenticated - userDetails is null");
            throw new UsernameNotFoundException("User not authenticated");
        }

        try {
            // First try to get the user by username/email
            String username = userDetails.getUsername();
            System.out.println("Current username from authentication: " + username);

            // Try to find the user by username/email
            User user = userRepository.findByEmail(username)
                    .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + username));

            System.out.println("Found user with ID: " + user.getId());

            // Now use the user ID to get the ratings
            Double averageRating = ratingService.getUserAverageRating(user.getId());
            int ratingCount = ratingService.getUserRatingCount(user.getId());

            System.out.println("Average rating: " + averageRating + ", Count: " + ratingCount);

            Map<String, Object> response = new HashMap<>();
            response.put("averageRating", averageRating != null ? averageRating : 0.0);
            response.put("ratingCount", ratingCount);

            return ResponseEntity.ok(response);

        } catch (UsernameNotFoundException e) {
            System.out.println("User not found: " + e.getMessage());
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found", e);
        } catch (Exception e) {
            System.out.println("Error getting user rating: " + e.getMessage());
            e.printStackTrace();
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Error fetching user rating", e);
        }
    }

    @GetMapping("/transaction/{transactionId}")
    public ResponseEntity<RatingResponse> getRatingByTransaction(@PathVariable Long transactionId) {
        RatingResponse response = ratingService.getRatingByTransaction(transactionId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/transaction/{transactionId}/eligible")
    public ResponseEntity<Boolean> isTransactionEligibleForRating(
            @PathVariable Long transactionId,
            @AuthenticationPrincipal UserDetails userDetails) {
        Long userId = Long.parseLong(userDetails.getUsername());
        boolean isEligible = ratingService.isTransactionEligibleForRating(transactionId, userId);
        return ResponseEntity.ok(isEligible);
    }

    @PostMapping("/transaction/{transactionId}")
    public ResponseEntity<?> rateTransaction(
            @PathVariable Long transactionId,
            @Valid @RequestBody RatingRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            // Get the user by email (which is stored as the username in UserDetails)
            User user = userRepository.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + userDetails.getUsername()));

            // Get the transaction with its relationships
            System.out.println("Looking for transaction with ID: " + transactionId);
            Transaction transaction = transactionRepository.findByIdWithRelations(transactionId)
                    .orElseThrow(() -> {
                        System.out.println("Transaction not found with ID: " + transactionId);
                        return new ResourceNotFoundException("Transaction not found with id: " + transactionId);
                    });

            System.out.println("Found transaction: " + transaction);
            System.out.println("Transaction buyer ID: " + transaction.getBuyer().getId());
            System.out.println("Item owner ID: " + transaction.getItem().getUser().getId());
            System.out.println("Current user ID: " + user.getId());

            // Verify the user is part of this transaction
            boolean isBuyer = transaction.getBuyer().getId().equals(user.getId());
            boolean isSeller = transaction.getItem().getUser().getId().equals(user.getId());

            System.out.println("Is buyer: " + isBuyer + ", Is seller: " + isSeller);

            if (!isBuyer && !isSeller) {
                return ResponseEntity.badRequest().body("You are not authorized to rate this transaction");
            }

            // Determine who is being rated (the other party in the transaction)
            Long ratedUserId = isBuyer ? transaction.getItem().getUser().getId() : transaction.getBuyer().getId();

            // Check if the user has already rated this transaction
            if (ratingRepository.existsByTransactionIdAndRaterId(transactionId, user.getId())) {
                return ResponseEntity.badRequest().body("You have already rated this transaction");
            }

            // Create and save the rating
            Rating rating = new Rating();
            rating.setRater(user);
            rating.setRatedUser(userRepository.findById(ratedUserId)
                    .orElseThrow(() -> new ResourceNotFoundException("Rated user not found")));
            rating.setTransaction(transaction);
            rating.setScore(request.getScore());
            rating.setComment(request.getComment());

            Rating savedRating = ratingRepository.save(rating);
            return ResponseEntity.ok(RatingResponse.fromEntity(savedRating));

        } catch (ResourceNotFoundException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error creating rating: " + e.getMessage());
        }
    }
}
