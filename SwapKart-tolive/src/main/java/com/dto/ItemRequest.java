package com.dto;

import com.entity.ItemType;
import com.entity.enums.ItemStatus;
import lombok.Data;
import jakarta.validation.constraints.DecimalMin;

import java.util.List;

@Data
public class ItemRequest {
    private String title;
    private String description;
    private ItemType type;
    private String category;
    private String city;
    private String pincode;
    private String condition;
    
    @DecimalMin(value = "0.0", message = "Price must be a positive number")
    private Double price;
    
    private ItemStatus status = ItemStatus.AVAILABLE;
    
    private List<String> imageUrl;
}