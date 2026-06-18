package com.possaas.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class LoyaltyPointsAdjustmentRequest {

    @NotNull(message = "Customer ID is required")
    private Long customerId;

    @NotNull(message = "Points amount is required")
    @Min(value = -10000, message = "Points adjustment cannot be less than -10000")
    @Max(value = 10000, message = "Points adjustment cannot exceed 10000")
    private Integer points;

    @NotBlank(message = "Reason is required")
    @Size(min = 5, max = 500, message = "Reason must be between 5 and 500 characters")
    private String reason;

    @Pattern(regexp = "EARNED|REDEEMED|ADJUSTED|BONUS|REFUNDED", 
             message = "Invalid transaction type")
    private String transactionType = "ADJUSTED";
}
