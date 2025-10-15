package com.service;

import com.dto.LoginRequest;
import com.dto.LoginResponse;
import com.dto.RegisterRequest;
import com.dto.RegisterResponse;
import com.dto.UserDto;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

public interface AuthService {
    LoginResponse authenticate(LoginRequest loginRequest);
    RegisterResponse register(RegisterRequest registerRequest);
    void logout(HttpServletRequest request, HttpServletResponse response);
    UserDto getCurrentUser(Long userId);
    UserDto getCurrentUserByEmail(String email);

    void sendPasswordResetEmail(String email);

    void resetPassword(String token, String newPassword);

}