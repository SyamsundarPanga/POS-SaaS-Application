package com.possaas.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class StockTransferRequest {

    @NotNull(message = "Product ID is required")
    private Long productId;

    @NotNull(message = "Source branch ID is required")
    private Long fromBranchId;

    @NotNull(message = "Destination branch ID is required")
    private Long toBranchId;

    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be at least 1")
    private Integer quantity;

    @Size(max = 1000, message = "Notes must not exceed 1000 characters")
    private String notes;
}
