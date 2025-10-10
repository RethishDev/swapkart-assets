package com.controller;

import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class PageController {

    @GetMapping("/add-item")
    public String addItemPage(CsrfToken csrfToken) {
        // The CsrfToken will be automatically added to the model
        return "add-item";
    }
}
