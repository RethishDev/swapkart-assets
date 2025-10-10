package com.entity;

public enum ItemType {
    SWAP,       // Items available for swapping
    DONATE,     // Items available for donation
    SELL,       // Items available for sale
    ;

    @Override
    public String toString() {
        return name().charAt(0) + name().substring(1).toLowerCase();
    }
}
