package com.dto;

import org.springframework.web.multipart.MultipartFile;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UserProfileUpdateRequest {
    @Size(min = 2, max = 50, message = "Name must be between 2 and 50 characters")
    private String name;
    
    @Email(message = "Please provide a valid email")
    @NotBlank(message = "Email is required")
    private String email;
    
    @Size(max = 100, message = "City must be less than 100 characters")
    private String city;
    
    @Pattern(regexp = "^[0-9]{10}$", message = "Contact must be a 10-digit number")
    private String contact;
    
    @Size(min = 6, max = 100, message = "Password must be between 6 and 100 characters")
    private String password;
}
