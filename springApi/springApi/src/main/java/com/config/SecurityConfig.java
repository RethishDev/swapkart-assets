package com.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/*.css",
                    "/*.html",
                    "/api/**",
                    "/**"  // This allows all other requests
                ).permitAll()
                .anyRequest().authenticated()
            )
            .csrf(csrf -> csrf.disable());  // Disabling CSRF for simplicity in development
            
        return http.build();
    }
}
