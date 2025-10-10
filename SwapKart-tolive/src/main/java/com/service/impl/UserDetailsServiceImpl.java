package com.service.impl;

import com.entity.User;
import com.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        System.out.println("=== Loading user by username: " + username + " ===");
        
        try {
            User user = userRepository.findByEmail(username)
                    .orElseThrow(() -> {
                        System.err.println("User not found in database: " + username);
                        return new UsernameNotFoundException("User not found with email: " + username);
                    });
            
            System.out.println("User found in database: " + user.getEmail() + " with role: " + user.getRole());
            System.out.println("Password hash: " + user.getPassword());
            
            return org.springframework.security.core.userdetails.User
                    .withUsername(user.getEmail())
                    .password(user.getPassword())
                    .authorities(user.getRole().name())
                    .accountExpired(false)
                    .accountLocked(false)
                    .credentialsExpired(false)
                    .disabled(false)
                    .build();
                    
        } catch (Exception e) {
            System.err.println("Error in loadUserByUsername for user: " + username);
            e.printStackTrace();
            throw e;
        }
    }
}
