package com.possaas.dto.request;

import java.math.BigDecimal;

import com.possaas.domain.product.ProductStatus;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateProductRequest {

	@NotBlank(message = "Product name is required")
	@Size(max = 255, message = "Product name must not exceed 255 characters")
	private String name;

	@Size(max = 50, message = "SKU must not exceed 50 characters")
    @Pattern(regexp = "^(|[A-Za-z0-9-_]+)$", message = "SKU must be alphanumeric with hyphens or underscores only")
    private String sku;

	@NotNull(message = "Price is required")
	@DecimalMin(value = "0.01", message = "Price must be greater than zero")
	private BigDecimal price;

	@DecimalMin(value = "0.00", message = "Cost price must be non-negative")
	private BigDecimal costPrice;

	@Size(max = 500, message = "Image URL must not exceed 500 characters")
	private String imageUrl;

	@Size(max = 2000, message = "Description must not exceed 2000 characters")
	private String description;

	private ProductStatus status = ProductStatus.ACTIVE;

	private Long branchId;

	private Long categoryId;

	@Size(max = 100, message = "Barcode must not exceed 100 characters")
	private String barcode;

	@Size(max = 50, message = "Unit must not exceed 50 characters")
	private String unit = "PCS";

	private Integer minStockLevel = 10;

	private Integer maxStockLevel;

	private Integer reorderPoint;

	private BigDecimal taxRate;

	private Boolean isTaxable = true;

	private Boolean allowDecimalQuantity = false;

	@Size(max = 1000, message = "Tags must not exceed 1000 characters")
	private String tags;
}
