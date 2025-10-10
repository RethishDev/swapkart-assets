package com.controller;

import com.service.EmailOtpService;
import jakarta.mail.MessagingException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/email")
@Slf4j
public class EmailOtpController {

    private final EmailOtpService emailOtpService;
    private final Map<String, String> otpStorage = new ConcurrentHashMap<>();

    public EmailOtpController(EmailOtpService emailOtpService) {
        this.emailOtpService = emailOtpService;
    }

    // Send OTP (accepts both JSON body or form params)
    @PostMapping("/send-otp")
    public ResponseEntity<String> sendOtp(@RequestBody(required = false) Map<String, String> body,
                                          @RequestParam(required = false) String email) throws MessagingException {
        // Handle both frontend (JSON) and Postman (query param)
        if (body != null && body.containsKey("email")) {
            email = body.get("email");
        }

        if (email == null || email.isEmpty()) {
            return ResponseEntity.badRequest().body("Email is required");
        }

        // Get name from request or use email's local part as fallback
        String username = (body != null && body.containsKey("name")) ? body.get("name") : email.split("@")[0];

        String otp = emailOtpService.sendOtp(email, username);
        otpStorage.put(email, otp);

        log.info("OTP sent successfully to {}", email);
        return ResponseEntity.ok("OTP sent successfully to " + email);
    }

    // Verify OTP (accepts both JSON body or form params)
    @PostMapping("/verify-otp")
    public ResponseEntity<String> verifyOtp(@RequestBody(required = false) Map<String, String> body,
                                            @RequestParam(required = false) String email,
                                            @RequestParam(required = false) String otp) {
        // Handle both frontend (JSON) and Postman (query param)
        if (body != null) {
            email = body.get("email");
            otp = body.get("otp");
        }

        if (email == null || otp == null) {
            return ResponseEntity.badRequest().body("Email and OTP are required");
        }

        String savedOtp = otpStorage.get(email);
        if (savedOtp != null && savedOtp.equals(otp)) {
            otpStorage.remove(email);
            log.info("OTP verified successfully for {}", email);
            return ResponseEntity.ok("OTP verified successfully!");
        } else {
            log.warn("Invalid or expired OTP for {}", email);
            return ResponseEntity.badRequest().body("Invalid or expired OTP!");
        }
    }
}
