package com.controller;

import com.model.User;
import com.repository.UserRepository;

import jakarta.servlet.http.HttpSession;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class GreetingsController {

    @Autowired
    private UserRepository userRepo;

    @PostMapping("/signup") 
    public ResponseEntity<?> signup(@RequestBody User user) {
        if (userRepo.findByUsername(user.getUsername()).isPresent())
        {
            return ResponseEntity.badRequest().body("Username already taken");
        }
        User savedUser = userRepo.save(user);
        return ResponseEntity.ok(savedUser);
    }
	
	@GetMapping("/")
	public String showLoginPage() {
	    return "login";
	}

	@GetMapping("/dashboard")
	public String showDashboard() {
	    return "dashboard"; 
	} 
	
	/*@PostMapping("/login")
	public ResponseEntity<Map<String, String>> login(@RequestBody User loginUser, HttpSession session) {
	    String username = loginUser.getUsername();
	    String password = loginUser.getPassword();

	    List<User> users = userRepo.findByUsernameAndPassword(username, password);
	    if (!users.isEmpty()) {
	        session.setAttribute("username", username);
	        return ResponseEntity.ok(Map.of("message", "Login successful", "username", username));
	    } else {
	        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
	                .body(Map.of("error", "Invalid credentials"));
	    }
	}*/
	
	@PostMapping("/login")
	public ResponseEntity<Map<String, String>> login(@RequestBody User loginUser, HttpSession session) {
	    String username = loginUser.getUsername();
	    String password = loginUser.getPassword();

	    List<User> users = userRepo.findByUsernameAndPassword(username, password);
	    if (!users.isEmpty()) {
	        User user = users.get(0);
	        session.setAttribute("username", user.getUsername());
	        session.setAttribute("email", user.getEmail());
	        session.setAttribute("mobile", user.getMobNo());
	        System.out.println("Session email: " + session.getAttribute("email"));
	        System.out.println("Session mobile: " + session.getAttribute("mobile"));
	        return ResponseEntity.ok(Map.of(
	            "message", "Login successful",
	            "username", user.getUsername()
	        ));
	    } else {
	        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
	                .body(Map.of("error", "Invalid credentials"));
	    }
	}

	
	@GetMapping("/logout")
	public ResponseEntity<String> logout(HttpSession session) {
	    session.invalidate();
	    return ResponseEntity.ok("Logged out successfully");
	}

}
