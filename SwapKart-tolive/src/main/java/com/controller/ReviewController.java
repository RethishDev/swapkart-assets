package com.controller;

import com.dto.ReviewRequest;
import com.entity.Review;
import com.service.ReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @PostMapping("/add")
    public Review addReview(@RequestBody ReviewRequest request) {
        return reviewService.addReview(request);
    }

    @GetMapping("/user/{userId}")
    public List<Review> getReviews(@PathVariable Long userId) {
        return reviewService.getUserReviews(userId);
    }
}
