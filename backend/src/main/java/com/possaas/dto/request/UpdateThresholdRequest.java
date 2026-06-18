package com.possaas.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
@Schema(description = "Request to update low stock threshold per product and branch")
public class UpdateThresholdRequest {

    @Schema(description = "Product ID", example = "25", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotNull(message = "Product ID is required")
    private Long productId;

    @Schema(description = "Branch ID", example = "5", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotNull(message = "Branch ID is required")
    private Long branchId;

    @Schema(description = "Low stock threshold (must be >= 0)", example = "10", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotNull(message = "Low stock threshold is required")
    @Min(value = 0, message = "Low stock threshold must be >= 0")
    private Integer lowStockThreshold;
}
