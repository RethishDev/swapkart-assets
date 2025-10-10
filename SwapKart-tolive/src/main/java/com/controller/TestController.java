package com.controller;

import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.nio.file.Files;
import java.util.Collections;
import java.util.Map;

@RestController
public class TestController {

    @GetMapping("/test/css/{filename}")
    public ResponseEntity<byte[]> getCss(@PathVariable String filename) throws IOException {
        Resource resource = new ClassPathResource("static/css/" + filename);
        byte[] bytes = Files.readAllBytes(resource.getFile().toPath());
        return ResponseEntity.ok()
                .contentType(MediaType.valueOf("text/css"))
                .body(bytes);
    }

    @GetMapping("/test/js/{filename}")
    public ResponseEntity<byte[]> getJs(@PathVariable String filename) throws IOException {
        Resource resource = new ClassPathResource("static/js/" + filename);
        byte[] bytes = Files.readAllBytes(resource.getFile().toPath());
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .body(bytes);
    }

    @GetMapping("/test/static/{filename}")
    public ResponseEntity<byte[]> getStaticFile(@PathVariable String filename) throws IOException {
        Resource resource = new ClassPathResource("static/" + filename);
        if (!resource.exists()) {
            return ResponseEntity.notFound().build();
        }
        byte[] bytes = Files.readAllBytes(resource.getFile().toPath());

        MediaType mediaType = MediaType.TEXT_HTML;
        if (filename.endsWith(".css")) {
            mediaType = MediaType.valueOf("text/css");
        } else if (filename.endsWith(".js")) {
            mediaType = MediaType.APPLICATION_JSON;
        } else if (filename.endsWith(".png")) {
            mediaType = MediaType.IMAGE_PNG;
        } else if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) {
            mediaType = MediaType.IMAGE_JPEG;
        }

        return ResponseEntity.ok()
                .contentType(mediaType)
                .body(bytes);
    }

    @GetMapping("/api/test/public")
    public ResponseEntity<Map<String, String>> publicEndpoint() {
        return ResponseEntity.ok(Collections.singletonMap("message", "This is a public endpoint"));
    }

    @GetMapping("/api/test/authenticated")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> authenticatedEndpoint() {
        return ResponseEntity.ok(Collections.singletonMap("message", "You are authenticated"));
    }

    @GetMapping("/api/test/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> adminEndpoint() {
        return ResponseEntity.ok(Collections.singletonMap("message", "Hello Admin!"));
    }

    @GetMapping("/api/test/user")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<Map<String, String>> userEndpoint() {
        return ResponseEntity.ok(Collections.singletonMap("message", "Hello User!"));
    }
}
