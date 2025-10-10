package com.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class ImageService {

    private final Path rootLocation;

    public ImageService(@Value("${file.upload-dir:uploads}") String uploadDir) {
        this.rootLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(rootLocation);
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize storage location", e);
        }
    }

    public String store(MultipartFile file, Long itemId) {
        try {
            if (file.isEmpty()) {
                throw new RuntimeException("Failed to store empty file");
            }

            // Generate a unique filename
            String originalFilename = StringUtils.cleanPath(file.getOriginalFilename());
            String fileExtension = "";
            if (originalFilename.contains(".")) {
                fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String newFilename = "item_" + itemId + "_" + UUID.randomUUID().toString() + fileExtension;

            // Create item-specific directory if it doesn't exist
            Path itemDir = this.rootLocation.resolve("item_" + itemId);
            if (!Files.exists(itemDir)) {
                Files.createDirectories(itemDir);
            }

            // Save the file
            Path targetLocation = itemDir.resolve(newFilename);
            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, targetLocation, StandardCopyOption.REPLACE_EXISTING);
            }

            return newFilename;
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file", e);
        }
    }

    public Resource loadAsResource(String filename) {
        try {
            Path file = load(filename);
            Resource resource = new UrlResource(file.toUri());
            if (resource.exists() || resource.isReadable()) {
                return resource;
            } else {
                throw new RuntimeException("Could not read file: " + filename);
            }
        } catch (MalformedURLException e) {
            throw new RuntimeException("Could not read file: " + filename, e);
        }
    }

    public void delete(String filename) throws IOException {
        Path file = load(filename);
        if (Files.exists(file)) {
            Files.delete(file);

            // Try to delete the parent directory if it's empty
            Path parentDir = file.getParent();
            if (parentDir != null && Files.isDirectory(parentDir)) {
                try {
                    Files.deleteIfExists(parentDir);
                } catch (IOException e) {
                    // Directory not empty, ignore
                }
            }
        }
    }

    private Path load(String filename) {
        // Extract item ID from filename (format: item_<id>_<uuid>.<ext>)
        String itemId = "";
        if (filename.startsWith("item_")) {
            int endIndex = filename.indexOf('_', 5); // Skip first 'item_'
            if (endIndex > 0) {
                itemId = filename.substring(5, endIndex);
            }
        }

        if (!itemId.isEmpty()) {
            return this.rootLocation.resolve("item_" + itemId).resolve(filename).normalize();
        }

        return this.rootLocation.resolve(filename).normalize();
    }

    public void init() {
        try {
            Files.createDirectories(rootLocation);
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize storage", e);
        }
    }
}
