package com.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${file.upload-dir}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Map the /uploads/items/** URL pattern to the file system directory
        registry.addResourceHandler("/uploads/items/**")
                .addResourceLocations("file:" + uploadDir);
    }

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        // Main pages
        registry.addViewController("/").setViewName("forward:/index.html");

        // Auth pages
        registry.addViewController("/login").setViewName("forward:/login.html");
        registry.addViewController("/register").setViewName("forward:/register.html");

        // Item pages
        registry.addViewController("/dashboard").setViewName("forward:/dashboard.html");
        registry.addViewController("/items").setViewName("forward:/items.html");
        registry.addViewController("/add-item").setViewName("forward:/add-item.html");

        // User pages
        registry.addViewController("/profile").setViewName("forward:/profile.html");
        registry.addViewController("/my-items").setViewName("forward:/my-items.html");
        registry.addViewController("/trades").setViewName("forward:/transactions.html");

        // Admin pages
        registry.addViewController("/admin").setViewName("forward:/admin-dashboard.html");
        registry.addViewController("/admin/dashboard").setViewName("forward:/admin-dashboard.html");
        registry.addViewController("/admin/items").setViewName("forward:/admin-items.html");
        registry.addViewController("/admin/users").setViewName("forward:/admin-users.html");
        registry.addViewController("/admin/transactions").setViewName("forward:/admin-transactions.html");
        registry.addViewController("/admin/reports").setViewName("forward:/admin-reports.html");
        registry.addViewController("/admin/settings").setViewName("forward:/admin-settings.html");

        // Error page mapping
        registry.addStatusController("/error", HttpStatus.NOT_FOUND);
        registry.addViewController("/error").setViewName("error");

        // Add all other HTML files that might be directly accessed
        //registry.addViewController("/**/{path:[^/]*}").setViewName("forward:/index.html");
    }
}