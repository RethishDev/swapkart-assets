package com.service;

import com.dto.ReviewRequest;
import com.entity.Review;
import com.entity.User;
import com.repository.ReviewRepository;
import com.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepo;
    private final UserRepository userRepo;

    public Review addReview(ReviewRequest request) {
        String reviewerEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User reviewer = userRepo.findByEmail(reviewerEmail).orElseThrow();

        User reviewedUser = userRepo.findById(request.getReviewedUserId()).orElseThrow();

        Review review = Review.builder()
                .reviewer(reviewer)
                .reviewedUser(reviewedUser)
                .rating(request.getRating())
                .comment(request.getComment())
                .createdAt(LocalDateTime.now())
                .build();

        return reviewRepo.save(review);
    }

    public List<Review> getUserReviews(Long userId) {
        User user = userRepo.findById(userId).orElseThrow();
        return reviewRepo.findByReviewedUser(user);
    }
}
