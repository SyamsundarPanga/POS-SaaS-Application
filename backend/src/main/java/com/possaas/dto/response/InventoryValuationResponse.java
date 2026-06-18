package com.possaas.dto.response;

import java.math.BigDecimal;
import java.util.List;

import lombok.Data;

@Data
public class InventoryValuationResponse {
    private List<InventoryValuationDto> items;
    private BigDecimal totalValue;
    private int totalProducts;
    private int lowStockCount;
}
