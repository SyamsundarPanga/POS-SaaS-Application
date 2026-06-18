package com.possaas.dto.response;

import java.math.BigDecimal;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InventoryValuationDto {
    private Long productId;
    private String productName;
    private String sku;
    private String categoryName;
    private Integer quantity;
    private BigDecimal costPrice;
    private BigDecimal valueAtCost;
    private boolean lowStock;
}
