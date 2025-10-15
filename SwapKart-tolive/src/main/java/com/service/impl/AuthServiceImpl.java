package com.service.impl;

import com.dto.LoginRequest;
import com.dto.LoginResponse;
import com.dto.RegisterRequest;
import com.dto.UserDto;
import com.dto.RegisterResponse;
import com.entity.User;
import com.repository.UserRepository;
import com.service.AuthService;
import com.service.EmailOtpService;
import com.service.JwtService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.stereotype.Service;
import com.entity.UserRole;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final JavaMailSender mailSender;

    @Override
    public LoginResponse authenticate(LoginRequest loginRequest) {
        // Authenticate user
        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                loginRequest.getEmail(),
                loginRequest.getPassword()
            )
        );

        // Get user details
        User user = userRepository.findByEmail(loginRequest.getEmail())
            .orElseThrow(() -> new RuntimeException("User not found"));

        // Generate JWT token
        String token = jwtService.generateToken(user.getEmail());
        Date expiration = jwtService.extractExpiration(token);

        return LoginResponse.builder()
            .token(token)
            .userId(user.getId())  // Add user ID to the response
            .email(user.getEmail())
            .fullName(user.getName())
            .role(user.getRole().name())
            .expiresIn(expiration.getTime())
            .build();
    }

    @Override
    public RegisterResponse register(RegisterRequest registerRequest) {
        // Check if user already exists
        if (userRepository.findByEmail(registerRequest.getEmail()).isPresent()) {
            throw new RuntimeException("User with this email already exists");
        }
        
        if (userRepository.findByMobile(registerRequest.getMobile()).isPresent()) {
            throw new RuntimeException("User with this mobile number already exists");
        }
        
        // Create new user with all provided details
        String encodedPassword = passwordEncoder.encode(registerRequest.getPassword());
        User user = User.builder()
            .name(registerRequest.getName())
            .email(registerRequest.getEmail())
            .password(encodedPassword)
            .mobile(registerRequest.getMobile())
            .city(registerRequest.getCity())
            .role(UserRole.USER)
            .build();
            
        userRepository.save(user);
        
        // Generate JWT token
        String token = jwtService.generateToken(user.getEmail());
        Date expiration = jwtService.extractExpiration(token);
        
        return RegisterResponse.builder()
            .token(token)
            .email(user.getEmail())
            .fullName(user.getName())
            .role(user.getRole().name())
            .expiresIn(expiration.getTime())
            .build();
    }

    @Override
    public void logout(HttpServletRequest request, HttpServletResponse response) {
        // Get authentication
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        // If authenticated, clear the security context and invalidate the session
        if (auth != null) {
            new SecurityContextLogoutHandler().logout(request, response, auth);
            SecurityContextHolder.clearContext();
        }
    }
    
    @Override
    public UserDto getCurrentUser(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
            
        return UserDto.builder()
            .id(user.getId())
            .username(user.getEmail()) // Using email as username
            .email(user.getEmail())
            .fullName(user.getName())  // Changed from getFullName to getName
            .phoneNumber(user.getMobile())  // Changed from getPhoneNumber to getMobile
            .city(user.getCity())
            .build();
    }
    
    @Override
    public UserDto getCurrentUserByEmail(String email) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found with email: " + email));
            
        return UserDto.builder()
            .id(user.getId())
            .username(user.getEmail())
            .email(user.getEmail())
            .fullName(user.getName())
            .phoneNumber(user.getMobile())
            .city(user.getCity())
            .build();
    }

    @Override
    public void sendPasswordResetEmail(String email) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found with email: " + email));

        String token = jwtService.generateToken(user.getEmail());
        String resetLink = "http://localhost:8081/reset-password?token=" + token;

        String subject = "Password Reset Request";
        String body = "Please click the link below to reset your password:\n\n" + resetLink;


        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom("swapkart@example.com");
        message.setTo(user.getEmail());
        message.setSubject(subject);
        message.setText(body);

        mailSender.send(message);
    }

    @Override
    @Transactional
    public void resetPassword(String token, String newPassword) {
        String email = jwtService.extractUsername(token);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Invalid or expired token"));

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }}
