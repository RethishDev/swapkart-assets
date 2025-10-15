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

    @JsonProperty("activeTrades")
    private long activeTrades;

    // Constructors, getters, and setters
    public ItemCountsDTO() {}

    public ItemCountsDTO(long swap, long sale, long wanted, long activeTrades) {
        this.swap = swap;
        this.sale = sale;
        this.wanted = wanted;
        this.activeTrades = activeTrades;
    }

    // Getters and Setters
    public long getSwap() { return swap; }
    public void setSwap(long swap) { this.swap = swap; }

    public long getSale() { return sale; }
    public void setSale(long sale) { this.sale = sale; }

    public long getWanted() { return wanted; }
    public void setWanted(long wanted) { this.wanted = wanted; }
    
    public long getActiveTrades() { return activeTrades; }
    public void setActiveTrades(long activeTrades) { this.activeTrades = activeTrades; }
}