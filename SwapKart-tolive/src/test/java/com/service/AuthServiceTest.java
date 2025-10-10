package com.service;

import com.dto.AuthResponse;
import com.dto.RegisterRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
public class AuthServiceTest {

    @Autowired
    private AuthService authService;

//    void testRegister() {
//        AuthResponse result = authService.register(RegisterRequest request);
//    }
}
