package com.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.transaction.annotation.EnableTransactionManagement;

@Configuration
@EnableJpaRepositories(basePackages = "com.repository")
@EnableTransactionManagement
public class JpaConfig {
    // JPA configuration is handled by Spring Boot autoconfiguration
    // This class enables JPA repositories and transaction management
}
