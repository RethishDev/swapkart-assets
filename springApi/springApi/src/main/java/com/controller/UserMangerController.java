	package com.controller;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.model.UserManger;
import com.model.User;
import com.repository.UserMangerRepository;
import com.repository.UserRepository;

import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/users")
public class UserMangerController {
	
	@Autowired
	private UserMangerRepository userMangerRepo;

	@Autowired
	private UserRepository userRepo;
	
	@GetMapping
	public List<UserManger> getUsers(){
		return userMangerRepo.findAll();
	}
	
	@PostMapping
	public UserManger addUser(@RequestBody UserManger userManger) {
		return userMangerRepo.save(userManger);
	}
	
	@DeleteMapping("/{id}")
	public String deleteUser(@PathVariable Long id) {
		userMangerRepo.deleteById(id);
		return "User deleted!";
	}
	
	@PutMapping("/{id}")
	public ResponseEntity<String> updateUser(@PathVariable Long id, @RequestBody UserManger updatedUser) {
	    return userMangerRepo.findById(id)
	            .map(user -> {
	                user.setName(updatedUser.getName());
	                user.setAge(updatedUser.getAge());
	                userMangerRepo.save(user);
	                return ResponseEntity.ok("User updated successfully");
	            })
	            .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found"));
	}
	
	/*@GetMapping("/current-user")
	public ResponseEntity<Map<String, String>> getCurrentUser(HttpSession session) {
	    String username = (String) session.getAttribute("username");
	    if (username == null) {
	        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
	                .body(Map.of("error", "User not logged in"));
	    }

	    Optional<User> user = userRepo.findByUsername(username);
	    if (user.isPresent()) {
	    	User u = user.get();
	        String originalUsername = user.get().getUsername();
	        String capitalizedUsername = originalUsername.substring(0, 1).toUpperCase() + originalUsername.substring(1);
	        System.out.println(u.getEmail()+" "+u.getMobNo());
	        return ResponseEntity.ok(Map.of("username", capitalizedUsername, "email", u.getEmail() != null ? u.getEmail() : "",
	                "mobile", u.getMobNo() != null ? u.getMobNo() : "" ));
	        
	        
	    } else {
	        return ResponseEntity.status(HttpStatus.NOT_FOUND)
	                .body(Map.of("error", "User not found"));
	    }
	}*/
	
	@GetMapping("/current-user")
	public ResponseEntity<Map<String, String>> getCurrentUser(HttpSession session) {
	    String username = (String) session.getAttribute("username");
	    String email = (String) session.getAttribute("email");
	    String mobile = (String) session.getAttribute("mobile");

	    if (username == null) {
	        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
	                .body(Map.of("error", "User not logged in"));
	    }

	    String capitalizedUsername = Character.toUpperCase(username.charAt(0)) + username.substring(1);
	    return ResponseEntity.ok(Map.of(
	        "username", capitalizedUsername,
	        "email", email != null ? email : "",
	        "mobile", mobile != null ? mobile : ""
	    ));
	}

	
    @PutMapping("/update-profile")
    public ResponseEntity<String> updateProfile(@RequestBody User updatedUser, HttpSession session) {
        String username = (String) session.getAttribute("username");
        if (username == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Not logged in");
        }

        Optional<User> userOpt = userRepo.findByUsername(username);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            user.setEmail(updatedUser.getEmail());
            user.setMobNo(updatedUser.getMobNo());
            userRepo.save(user);
            return ResponseEntity.ok("Profile updated successfully");
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
        }
    }

    // Change password
    @PostMapping("/change-password")
    public ResponseEntity<String> changePassword(@RequestBody Map<String, String> body, HttpSession session) {
        String username = (String) session.getAttribute("username");
        if (username == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Not logged in");
        }

        String currentPassword = body.get("currentPassword");
        String newPassword = body.get("newPassword");

        List<User> users = userRepo.findByUsernameAndPassword(username, currentPassword);
        if (!users.isEmpty()) {
            User user = users.get(0);
            user.setPassword(newPassword);
            userRepo.save(user);
            return ResponseEntity.ok("Password changed successfully");
        } else {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Current password is incorrect");
        }
    }
}


