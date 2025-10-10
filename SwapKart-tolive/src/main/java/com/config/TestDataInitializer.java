package com.config;/*
package com.config;

import com.entity.User;
import com.entity.UserRole;
import com.repository.UserRepository;
import com.util.TestUserData;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.context.annotation.Role;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

*/
/**
 * Initializes test data in the database when running in development or test profile.
 *//*

@Component
@Profile({"dev", "test"}) // Only activate in development or test profiles
public class TestDataInitializer {

    private static final Logger logger = LoggerFactory.getLogger(TestDataInitializer.class);

    private final UserRepository userRepository;
    //private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public TestDataInitializer(UserRepository userRepository,
                             // RoleRepository roleRepository,
                              PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
       // this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    */
/**
     * Initialize test data after the application context is loaded.
     *//*

    @PostConstruct
    @Transactional
    public void init() {
        // Only proceed if no users exist in the database
        if (userRepository.count() == 0) {
            logger.info("Initializing test data...");

            // Create roles if they don't exist
            Role adminRole = createRoleIfNotFound(UserRole.ADMIN);
            Role userRole = createRoleIfNotFound(UserRole.USER);

            // Create test users
            createTestUser(TestUserData.createAdminUser(), adminRole);
            createTestUser(TestUserData.createRegularUser(), userRole);
            createTestUser(TestUserData.createInactiveUser(), userRole);

            logger.info("Test data initialization completed.");
        } else {
            logger.info("Database already contains data. Skipping test data initialization.");
        }
    }

    */
/**
     * Create a role if it doesn't exist in the database.
     * @param role The role to create
     * @return The created or existing role
     *//*

    private Role createRoleIfNotFound(UserRole role) {
        return roleRepository.findByName(role)
                .orElseGet(() -> {
                    Role newRole = new Role();
                    newRole.setName(role);
                    return roleRepository.save(newRole);
                });
    }

    */
/**
     * Create a test user in the database.
     * @param user The user to create
     * @param roles The roles to assign to the user
     *//*

    private void createTestUser(User user, Role... roles) {
        // Check if user already exists
        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            logger.info("User {} already exists. Skipping creation.", user.getEmail());
            return;
        }

        // Encode the password
        user.setPassword(passwordEncoder.encode(user.getPassword()));

        // Set roles
        if (roles != null && roles.length > 0) {
            Set<Role> roleSet = new HashSet<>(Arrays.asList(roles));
            user.setRoles(roleSet);
        }

        // Save the user
        User savedUser = userRepository.save(user);
        logger.info("Created test user: {}", savedUser.getEmail());
    }

    */
/**
     * Create multiple test users.
     * @param users The users to create
     *//*

    private void createTestUsers(User... users) {
        for (User user : users) {
            createTestUser(user);
        }
    }
}
*/
