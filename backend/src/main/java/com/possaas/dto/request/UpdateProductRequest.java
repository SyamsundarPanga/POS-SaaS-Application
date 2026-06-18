package com.possaas.dto.request;

import com.possaas.domain.product.ProductStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class UpdateProductRequest {

    @Size(max = 255, message = "Product name must not exceed 255 characters")
    private String name;

    @DecimalMin(value = "0.01", message = "Price must be greater than zero")
    private BigDecimal price;

    @DecimalMin(value = "0.00", message = "Cost price must be non-negative")
    private BigDecimal costPrice;

    @Size(max = 500, message = "Image URL must not exceed 500 characters")
    private String imageUrl;

    @Size(max = 2000, message = "Description must not exceed 2000 characters")
    private String description;

    private ProductStatus status;

    private Long categoryId;

    @Size(max = 100, message = "Barcode must not exceed 100 characters")
    private String barcode;

    @Size(max = 50, message = "Unit must not exceed 50 characters")
    private String unit;

    private Integer minStockLevel;

    private Integer maxStockLevel;

    private Integer reorderPoint;

    private BigDecimal taxRate;

    private Boolean isTaxable;

    private Boolean allowDecimalQuantity;

    @Size(max = 1000, message = "Tags must not exceed 1000 characters")
    private String tags;
}
