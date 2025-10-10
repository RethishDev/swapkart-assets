package com.controller;

import com.service.ImageService;
import com.service.ItemService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@RestController
@RequestMapping("/api/images")
@RequiredArgsConstructor
public class ImageController {

    private final ImageService imageService;
    private final ItemService itemService;

    @PostMapping("/upload/{itemId}")
    public ResponseEntity<?> uploadImage(
            @PathVariable Long itemId,
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {

        // Verify the user owns the item
        if (!itemService.doesUserOwnItem(authentication.getName(), itemId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You are not authorized to upload images for this item");
        }

        try {
            String filename = imageService.store(file, itemId);
            String imageUrl = "/api/images/" + filename;

            // Add the image URL to the item
            itemService.addImageToItem(itemId, imageUrl);

            return ResponseEntity.ok().body("{'url':'' + imageUrl + ''}");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to upload image: " + e.getMessage());
        }
    }

    @GetMapping("/{filename:.+}")
    public ResponseEntity<Resource> serveFile(@PathVariable String filename) {
        try {
            Resource file = imageService.loadAsResource(filename);
            String contentType = Files.probeContentType(Paths.get(file.getFilename()));

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + file.getFilename() + "\"")
                    .body(file);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{itemId}")
    public ResponseEntity<?> deleteImage(
            @PathVariable Long itemId,
            @RequestParam String imageUrl,
            Authentication authentication) {

        // Verify the user owns the item
        if (!itemService.doesUserOwnItem(authentication.getName(), itemId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You are not authorized to delete images for this item");
        }

        try {
            // Extract filename from URL
            String filename = imageUrl.substring(imageUrl.lastIndexOf('/') + 1);

            // Remove from storage
            imageService.delete(filename);

            // Remove from item's image list
            itemService.removeImageFromItem(itemId, imageUrl);

            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to delete image: " + e.getMessage());
        }
    }

    @GetMapping("/item/{itemId}")
    public ResponseEntity<List<String>> getItemImages(@PathVariable Long itemId) {
        return ResponseEntity.ok(itemService.getItemImages(itemId));
    }
}
