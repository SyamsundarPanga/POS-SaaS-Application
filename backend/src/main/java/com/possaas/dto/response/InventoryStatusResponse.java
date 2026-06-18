package com.possaas.dto.response;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InventoryStatusResponse {
    private String category;
    private int inStock;
    private int outOfStock;
    private int lowStock;
}