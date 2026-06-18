package com.possaas.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.possaas.domain.product.ProductStatus;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "Inventory response object with product details")
public class InventoryDto {

    @Schema(description = "Inventory ID", example = "101")
    private Long id;

    @Schema(description = "Tenant identifier", example = "tenant_abc")
    private String tenantId;

    @Schema(description = "Product ID", example = "25")
    private Long productId;

    @Schema(description = "Product name", example = "Pepsi 750ml")
    private String productName;

    @Schema(description = "Stock Keeping Unit", example = "PEP-750")
    private String sku;

    @Schema(description = "Product barcode", example = "1234567890123")
    private String productBarcode;

    @Schema(description = "Product price", example = "35.00")
    private BigDecimal price;

    @Schema(description = "Product status")
    private ProductStatus productStatus;

    @Schema(description = "Product category name", example = "Soft Drinks")
    private String categoryName;

    @Schema(description = "Branch ID", example = "5")
    private Long branchId;

    @Schema(description = "Branch name", example = "Downtown Store")
    private String branchName;

    @Schema(description = "Available stock quantity", example = "50")
    private Integer quantity;

    @Schema(description = "Low stock threshold", example = "10")
    private Integer lowStockThreshold;

    @Schema(description = "Reserved quantity for pending orders", example = "5")
    private Integer reservedQuantity;

    @Schema(description = "Available quantity (quantity - reserved)", example = "45")
    private Integer availableQuantity;

    @Schema(description = "Is stock below threshold", example = "false")
    private Boolean isLowStock;

    @Schema(description = "Last restock date")
    private LocalDateTime lastRestockDate;

    @Schema(description = "Last sale date")
    private LocalDateTime lastSaleDate;

    @Schema(description = "Soft delete flag", example = "false")
    private Boolean isDeleted;

    @Schema(description = "Creation timestamp", example = "2025-02-01T10:15:30")
    private LocalDateTime createdAt;

    @Schema(description = "Last update timestamp", example = "2025-02-01T12:30:00")
    private LocalDateTime updatedAt;
}
