package com.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class ItemCountsDTO {
    @JsonProperty("swap")
    private long swap;

    @JsonProperty("sell")
    private long sale;

    @JsonProperty("donate")
    private long wanted;

    // Constructors, getters, and setters
    public ItemCountsDTO() {}

    public ItemCountsDTO(long swap, long sale, long wanted) {
        this.swap = swap;
        this.sale = sale;
        this.wanted = wanted;
    }

    // Getters and Setters
    public long getSwap() { return swap; }
    public void setSwap(long swap) { this.swap = swap; }

    public long getSale() { return sale; }
    public void setSale(long sale) { this.sale = sale; }

    public long getWanted() { return wanted; }
    public void setWanted(long wanted) { this.wanted = wanted; }
}