package com.dto;

import com.entity.Item;
import com.entity.ItemType;
import com.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ItemResponse {
    private Long id;
    private String title;
    private String description;
    private ItemType type;
    private String category;
    private String city;
    private String pincode;
    private String condition;
    private Double price;
    private List<String> imageUrls;
    private Boolean isAvailable;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String active;
    private SellerDto seller;
    private Boolean deleted; // soft-deleted flag
    private Boolean deletedByAdmin; // indicates admin performed the delete

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SellerDto {
        private Long id;
        private String name;
        private String email;
        private String phone;

        public static SellerDto fromUser(User user) {
            if (user == null) return null;
            return SellerDto.builder()
                    .id(user.getId())
                    .name(user.getName())
                    .email(user.getEmail())
                    .phone(user.getMobile())
                    .build();
        }
    }

    public static ItemResponse fromItem(Item item) {
        if (item == null) {
            return null;
        }
        
        // Get the condition, default to "Not specified" if null or empty
        String itemCondition = (item.getItemCondition() != null && !item.getItemCondition().trim().isEmpty()) 
            ? item.getItemCondition() 
            : "Not specified";
            
        return ItemResponse.builder()
                .id(item.getId())
                .title(item.getTitle())
                .description(item.getDescription())
                .type(item.getType())
                .category(item.getCategory())
                .city(item.getCity())
                .pincode(item.getPincode())
                .condition(itemCondition)
                .price(item.getPrice())
                .imageUrls(item.getImageUrls())
                .isAvailable(item.getAvailable())
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt())
                .active(item.getActive())
                .deleted(item.getDeleted())
                .deletedByAdmin(item.getDeletedByAdmin())
                .seller(item.getUser() != null ? SellerDto.fromUser(item.getUser()) : null)
                .build();
    }
}
