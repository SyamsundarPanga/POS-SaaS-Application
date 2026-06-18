package com.possaas.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CloseShiftRequest {
    @NotNull(message = "Final cash is required")
    @DecimalMin(value = "0.0", message = "Final cash must be positive")
    private BigDecimal finalCash;
    
    private String notes;
}
