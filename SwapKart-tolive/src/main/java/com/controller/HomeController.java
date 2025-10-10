package com.controller;

import jakarta.annotation.security.PermitAll;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class HomeController {

    @GetMapping("/")
    public String home() {
        return "redirect:/index.html";
    }

    @PermitAll
    @GetMapping("/login")
    public String login() {
        return "redirect:/login.html";
    }

    @PermitAll
    @GetMapping("/register")
    public String register() {
        return "redirect:/register.html";
    }

    @PermitAll
    @GetMapping("/items")
    public String items() {
        return "redirect:/items.html";
    }
    
    @PermitAll
    @GetMapping("/messages")
    public String messages() {
        return "forward:/messages.html";
    }
}