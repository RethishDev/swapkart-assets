package com.util;

import com.entity.User;
import com.entity.UserRole;

/**
 * Utility class for managing test user data used in authentication and authorization tests.
 */
public class TestUserData {

    // Test user credentials
    public static final String TEST_ADMIN_EMAIL = "admin@swapkart.com";
    public static final String TEST_ADMIN_PASSWORD = "admin123";
    public static final String TEST_USER_EMAIL = "user@swapkart.com";
    public static final String TEST_USER_PASSWORD = "user123";
    public static final String TEST_INACTIVE_EMAIL = "inactive@swapkart.com";
    public static final String TEST_INACTIVE_PASSWORD = "inactive123";

    // Test user details
    public static final String TEST_FIRST_NAME = "Test";
    public static final String TEST_LAST_NAME = "User";
    public static final String TEST_PHONE = "+1234567890";
    public static final boolean TEST_ACTIVE = true;

    private TestUserData() {
        // Private constructor to prevent instantiation
    }

    /**
     * Create a test admin user with ADMIN role
     * @return User object with admin role
     */
    public static User createAdminUser() {
        return createUser(TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD, UserRole.ROLE_ADMIN);
    }

    /**
     * Create a test regular user with USER role
     * @return User object with user role
     */
    public static User createRegularUser() {
        return createUser(TEST_USER_EMAIL, TEST_USER_PASSWORD, UserRole.USER);
    }

    /**
     * Create a test inactive user
     * @return Inactive User object
     */
    public static User createInactiveUser() {
        User user = createUser(TEST_INACTIVE_EMAIL, TEST_INACTIVE_PASSWORD, UserRole.USER);
        user.setActive(false);
        return user;
    }

    /**
     * Create a test user with the specified role
     * @param email User email
     * @param password User password (plain text, will be hashed when saved)
     * @param role User role
     * @return User object with the specified role
     */
    public static User createUser(String email, String password, UserRole role) {
        User user = new User();
        user.setEmail(email);
        user.setPassword(password); // Note: Password should be encoded before saving
        user.setName(TEST_FIRST_NAME + " " + TEST_LAST_NAME);
        user.setMobile(TEST_PHONE);
        user.setActive(TEST_ACTIVE);
        user.setCity("Test City");
        user.setRole(role);
        
        return user;
    }

    /**
     * Get all test users
     * @return Array of test users
     */
    public static User[] getAllTestUsers() {
        return new User[]{
            createAdminUser(),
            createRegularUser(),
            createInactiveUser()
        };
    }

    /**
     * Get a test user by email
     * @param email Email of the test user to retrieve
     * @return User object or null if not found
     */
    public static User getTestUserByEmail(String email) {
        for (User user : getAllTestUsers()) {
            if (user.getEmail().equalsIgnoreCase(email)) {
                return user;
            }
        }
        return null;
    }

    /**
     * Check if an email belongs to a test user
     * @param email Email to check
     * @return true if the email belongs to a test user, false otherwise
     */
    public static boolean isTestUser(String email) {
        return getTestUserByEmail(email) != null;
    }

    /**
     * Get the test password for a test user
     * @param email Test user's email
     * @return The test password or null if not a test user
     */
    public static String getTestPassword(String email) {
        if (TEST_ADMIN_EMAIL.equalsIgnoreCase(email)) {
            return TEST_ADMIN_PASSWORD;
        } else if (TEST_USER_EMAIL.equalsIgnoreCase(email)) {
            return TEST_USER_PASSWORD;
        } else if (TEST_INACTIVE_EMAIL.equalsIgnoreCase(email)) {
            return TEST_INACTIVE_PASSWORD;
        }
        return null;
    }
}
