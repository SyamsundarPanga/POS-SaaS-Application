package com.possaas.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class OpenShiftRequest {
    @NotNull(message = "Starting cash is required")
    @DecimalMin(value = "0.0", message = "Starting cash must be positive")
    private BigDecimal startingCash;
    
    private String notes;

    private Long branchId;
}
