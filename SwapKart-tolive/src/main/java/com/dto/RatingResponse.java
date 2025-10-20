package com.dto;

import com.entity.Rating;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RatingResponse {
    private Long id;
    private Long raterId;
    private String raterName;
    private Long ratedUserId;
    private String ratedUserName;
    private Integer score;
    private String comment;
    private Long transactionId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static RatingResponse fromEntity(Rating rating) {
        return RatingResponse.builder()
                .id(rating.getId())
                .raterId(rating.getRater().getId())
                .raterName(getDisplayName(rating.getRater()))
                .ratedUserId(rating.getRatedUser().getId())
                .ratedUserName(getDisplayName(rating.getRatedUser()))
                .score(rating.getScore())
                .comment(rating.getComment())
                .transactionId(rating.getTransaction() != null ? rating.getTransaction().getId() : null)
                .createdAt(rating.getCreatedAt())
                .updatedAt(rating.getUpdatedAt())
                .build();
    }

    private static String getDisplayName(com.entity.User user) {
        // Return user's name if it's present and not empty; otherwise fall back to email, then Anonymous
        if (user == null) return "Anonymous User";
        if (user.getName() != null && !user.getName().trim().isEmpty()) {
            return user.getName();
        }
        return user.getEmail() != null && !user.getEmail().trim().isEmpty() ? user.getEmail() : "Anonymous User";
    }
}
