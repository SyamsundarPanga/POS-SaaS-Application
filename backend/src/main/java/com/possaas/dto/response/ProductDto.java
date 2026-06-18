package com.possaas.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.possaas.domain.product.ProductStatus;
import lombok.Data;

@Data
public class ProductDto {

	private Long id;
	private String name;
	private String sku;
	private BigDecimal price;
	private BigDecimal costPrice;
	private String imageUrl;
	private String description;
	private ProductStatus status;
	private Long categoryId;
	private String categoryName;
	private String barcode;
	private String unit;
	private Integer minStockLevel;
	private Integer maxStockLevel;
	private Integer reorderPoint;
	private BigDecimal taxRate;
	private Boolean isTaxable;
	private Boolean allowDecimalQuantity;
	private String tags;
	private Long branchId;
	private String tenantId;
	private LocalDateTime createdAt;
	private LocalDateTime updatedAt;
	
	// Additional computed fields
	private Integer currentStock; // Can be populated from inventory
	private Boolean isLowStock;
}
