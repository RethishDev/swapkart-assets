package com.config;

import com.entity.User;
import com.entity.UserRole;
import com.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.event.EventListener;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@RequiredArgsConstructor
public class DefaultAdminConfig {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @EventListener(ApplicationReadyEvent.class)
    public void createDefaultAdmin() {
        String adminEmail = "admin@swapkart.com";
        String adminPassword = "admin123";
        
        if (!userRepository.existsByEmail(adminEmail)) {
            User admin = new User();
            admin.setEmail(adminEmail);
            admin.setPassword(passwordEncoder.encode(adminPassword));
            admin.setRole(UserRole.ROLE_ADMIN);
            admin.setName("Aiswarya");
            admin.setCity("Default");
            admin.setMobile("8590360735");
            
            userRepository.save(admin);
            System.out.println("Default admin user created with email: " + adminEmail);
        }
    }
}
