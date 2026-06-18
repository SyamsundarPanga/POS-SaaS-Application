package com.possaas.dto.response;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class LowStockAlertDto {

    private Long productId;
    private String productName;
    private String sku;
    private Long branchId;
    private String branchName;
    private Integer currentStock;
    private Integer threshold;
    private Integer deficit; // How many units below threshold
    private BigDecimal reorderCost; // Estimated cost to reorder
    private String severity; // LOW, MEDIUM, HIGH, CRITICAL
}
