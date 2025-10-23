package com.entity;

import com.entity.enums.ItemStatus;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Entity
@Table(name = "items")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Item {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(nullable = false, length = 1000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ItemType type;

    @Column(nullable = false, length = 50)
    private String category;

    @Column(nullable = false, length = 50)
    private String city;

    @Column(nullable = false, length = 6)
    private String pincode;

    @ElementCollection
    @CollectionTable(name = "item_images", joinColumns = @JoinColumn(name = "item_id"))
    @Column(name = "image_url")
    @Builder.Default
    private List<String> imageUrls = new ArrayList<>();

    @Column(name = "is_available", nullable = false)
    @Builder.Default
    private Boolean available = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "itemcondition", length = 20, nullable = false)
    private String itemCondition;

    @Column(columnDefinition = "numeric(10,2) default 0.00")
    private Double price;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;

    @Column(name = "active", nullable = false)
    private String active = "true";

    @Column(name = "deleted", nullable = false)
    @Builder.Default
    private Boolean deleted = false; // true when item has been deleted (soft-delete)

    // New flag to indicate the deletion was performed by an admin
    @Column(name = "deleted_by_admin", nullable = false)
    @Builder.Default
    private Boolean deletedByAdmin = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ItemStatus status = ItemStatus.AVAILABLE;

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * Adds an image URL to the item's image list
     * @param imageUrl The URL of the image to add
     */
    public void addImageUrl(String imageUrl) {
        if (this.imageUrls == null) {
            this.imageUrls = new ArrayList<>();
        }
        if (imageUrl != null && !imageUrl.trim().isEmpty() && !this.imageUrls.contains(imageUrl)) {
            this.imageUrls.add(imageUrl);
        }
    }

    /**
     * Removes an image URL from the item's image list
     * @param imageUrl The URL of the image to remove
     * @return true if the image was found and removed, false otherwise
     */
    public boolean removeImageUrl(String imageUrl) {
        if (this.imageUrls == null) {
            return false;
        }
        return this.imageUrls.remove(imageUrl);
    }

    /**
     * Gets all image URLs for this item
     * @return List of image URLs
     */
    public List<String> getImageUrls() {
        if (this.imageUrls == null) {
            this.imageUrls = new ArrayList<>();
        }
        return this.imageUrls;
    }

    /**
     * Sets the list of image URLs for this item
     * @param imageUrls List of image URLs
     */
    public void setImageUrls(List<String> imageUrls) {
        this.imageUrls = imageUrls != null ? new ArrayList<>(imageUrls) : new ArrayList<>();
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Item item = (Item) o;
        return id != null && id.equals(item.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}