package com.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private String role;    // e.g., "ROLE_ADMIN" or "ROLE_USER"
}
