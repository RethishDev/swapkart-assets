package com.dto;

import lombok.Data;

@Data
public class ReviewRequest {
    private Long reviewedUserId;
    private int rating;
    private String comment;
}
