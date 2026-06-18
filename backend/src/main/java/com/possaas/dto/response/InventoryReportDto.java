package com.possaas.dto.response;

import java.math.BigDecimal;

import lombok.Data;

@Data
public class InventoryReportDto {
    private Long productId;
    private String productName;
    private String sku;
    private Long categoryId;
    private String categoryName;
    private Integer currentStock;
    private BigDecimal costPrice;
    private BigDecimal valueAtCost;
    private Integer lowStockThreshold;
    private Boolean isLowStock;
    private Long branchId;
    private String branchName;
}
