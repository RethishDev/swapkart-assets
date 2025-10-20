package com.dto;

import com.entity.Item;
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
public class ItemResponseDto {
    private Long id;
    private String title;
    private String description;
    private String type;
    private String category;
    private String city;
    private String pincode;
    private List<String> imageUrls;
    private Boolean available;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String itemCondition;
    private Double price;
    private String active;
    private Boolean deleted;
    private String sellerName;
    private String sellerEmail;
    private String sellerPhone;

    public static ItemResponseDto fromEntity(Item item) {
        return ItemResponseDto.builder()
                .id(item.getId())
                .title(item.getTitle())
                .description(item.getDescription())
                .type(item.getType().name())
                .category(item.getCategory())
                .city(item.getCity())
                .pincode(item.getPincode())
                .imageUrls(item.getImageUrls())
                .available(item.getAvailable())
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt())
                .itemCondition(item.getItemCondition())
                .price(item.getPrice())
                .active(item.getActive())
                .deleted(item.getDeleted())
                .sellerName(item.getUser() != null ? item.getUser().getName() : "Unknown")
                .sellerEmail(item.getUser() != null ? item.getUser().getEmail() : "Unknown")
                .sellerPhone(item.getUser() != null ? item.getUser().getMobile() : "Unknown")
                .build();
    }
}
