package com.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserProfileResponse {
    private String name;
    private String email;
    private String city;
    private String contact;
    private String role;
}
