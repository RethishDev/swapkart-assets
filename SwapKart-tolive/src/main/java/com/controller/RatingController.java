package com.controller;

import com.dto.RatingRequest;
import com.dto.RatingResponse;
import com.service.RatingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/api/ratings")
@RequiredArgsConstructor
public class RatingController {

    private final RatingService ratingService;

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

    @GetMapping("/check-rating/{ratedUserId}")
    public ResponseEntity<Boolean> hasUserRated(
            @PathVariable Long ratedUserId,
            @AuthenticationPrincipal UserDetails userDetails) {
        Long raterId = Long.parseLong(userDetails.getUsername());
        boolean hasRated = ratingService.hasUserRated(raterId, ratedUserId);
        return ResponseEntity.ok(hasRated);
    }

    @GetMapping("/transaction/{transactionId}")
    public ResponseEntity<RatingResponse> getRatingByTransaction(@PathVariable Long transactionId) {
        RatingResponse response = ratingService.getRatingByTransaction(transactionId);
        return ResponseEntity.ok(response);
    }
}
