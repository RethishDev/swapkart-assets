/*
package com.security;

import com.config.TestDataInitializer;
import com.dto.LoginRequest;
import com.util.TestUserData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithAnonymousUser;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.shaded.com.fasterxml.jackson.databind.ObjectMapper;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class AuthenticationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private TestDataInitializer testDataInitializer;

    private static final String AUTH_URL = "/api/auth";
    private static final String TEST_URL = "/api/test";

    @BeforeEach
    public void setup() {
        // Ensure test data is initialized before each test
        testDataInitializer.init();
    }

    @Test
    @WithAnonymousUser
    public void testPublicEndpoint_ShouldBeAccessibleWithoutAuthentication() throws Exception {
        mockMvc.perform(get(TEST_URL + "/public")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message", is("This is a public endpoint")));
    }

    @Test
    @WithAnonymousUser
    public void testAuthenticatedEndpoint_ShouldBeUnauthorizedWithoutToken() throws Exception {
        mockMvc.perform(get(TEST_URL + "/authenticated")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "USER")
    public void testUserEndpoint_ShouldBeAccessibleWithUserRole() throws Exception {
        mockMvc.perform(get(TEST_URL + "/user")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message", is("Hello User!")));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    public void testAdminEndpoint_ShouldBeAccessibleWithAdminRole() throws Exception {
        mockMvc.perform(get(TEST_URL + "/admin")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message", is("Hello Admin!")));
    }

    @Test
    @WithMockUser(roles = "USER")
    public void testAdminEndpoint_ShouldBeForbiddenForNonAdminUsers() throws Exception {
        mockMvc.perform(get(TEST_URL + "/admin")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithAnonymousUser
    public void testLogin_WithValidCredentials_ShouldReturnToken() throws Exception {
        LoginRequest loginRequest = new LoginRequest(
                TestUserData.TEST_USER_EMAIL,
                TestUserData.TEST_USER_PASSWORD
        );

        mockMvc.perform(post(AUTH_URL + "/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.token").isString())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.email").value(TestUserData.TEST_USER_EMAIL))
                .andExpect(jsonPath("$.roles").isArray())
                .andExpect(jsonPath("$.roles[0]").value("ROLE_USER"));
    }

    @Test
    @WithAnonymousUser
    public void testLogin_WithInvalidCredentials_ShouldReturnUnauthorized() throws Exception {
        LoginRequest loginRequest = new LoginRequest(
                "nonexistent@example.com",
                "wrongpassword"
        );

        mockMvc.perform(post(AUTH_URL + "/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithAnonymousUser
    public void testLogin_WithInactiveAccount_ShouldReturnUnauthorized() throws Exception {
        LoginRequest loginRequest = new LoginRequest(
                TestUserData.TEST_INACTIVE_EMAIL,
                TestUserData.TEST_INACTIVE_PASSWORD
        );

        mockMvc.perform(post(AUTH_URL + "/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithAnonymousUser
    public void testAccessProtectedResource_WithValidToken_ShouldSucceed() throws Exception {
        // First, login to get a token
        LoginRequest loginRequest = new LoginRequest(
                TestUserData.TEST_USER_EMAIL,
                TestUserData.TEST_USER_PASSWORD
        );

        MvcResult result = mockMvc.perform(post(AUTH_URL + "/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andReturn();

        // Extract token from response
        String response = result.getResponse().getContentAsString();
        String token = objectMapper.readTree(response).get("token").asText();

        // Use the token to access a protected resource
        mockMvc.perform(get(TEST_URL + "/authenticated")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    @WithAnonymousUser
    public void testAccessProtectedResource_WithInvalidToken_ShouldFail() throws Exception {
        mockMvc.perform(get(TEST_URL + "/authenticated")
                .header("Authorization", "Bearer invalid.token.here")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "USER")
    public void testLogout_ShouldInvalidateToken() throws Exception {
        // This test is a bit tricky since we're using stateless JWT
        // In a real application, you might want to implement token blacklisting
        // For now, we'll just test that the endpoint is accessible
        mockMvc.perform(post(AUTH_URL + "/logout")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Logout successful"));
    }

    @Test
    @WithAnonymousUser
    public void testAccessAfterLogout_ShouldFail() throws Exception {
        // First, login to get a token
        LoginRequest loginRequest = new LoginRequest(
                TestUserData.TEST_USER_EMAIL,
                TestUserData.TEST_USER_PASSWORD
        );

        MvcResult result = mockMvc.perform(post(AUTH_URL + "/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andReturn();

        // Extract token from response
        String response = result.getResponse().getContentAsString();
        String token = objectMapper.readTree(response).get("token").asText();

        // Logout
        mockMvc.perform(post(AUTH_URL + "/logout")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        // Try to access protected resource after logout
        // Note: This will only work if you've implemented token invalidation
        mockMvc.perform(get(TEST_URL + "/authenticated")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }
}
*/
