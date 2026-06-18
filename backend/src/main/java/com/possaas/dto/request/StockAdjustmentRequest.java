package com.possaas.dto.request;

import com.possaas.domain.inventory.StockMovementType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class StockAdjustmentRequest {

    @NotNull(message = "Product ID is required")
    private Long productId;

    private Long branchId; // Required for branch inventory

    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be at least 1")
    private Integer quantity;

    @NotNull(message = "Movement type is required")
    private StockMovementType movementType;

    @Size(max = 1000, message = "Notes must not exceed 1000 characters")
    private String notes;

    private String referenceType; // ADJUSTMENT, RESTOCK, WRITE_OFF, etc.

    private Long referenceId;
}
