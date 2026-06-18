package com.possaas.dto.request;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class ValidateDiscountRequest {

    @NotNull(message = "branchId is required")
    private Long branchId;

    @DecimalMin(value = "0.00", message = "discountPercent must be >= 0")
    @DecimalMax(value = "100.00", message = "discountPercent must be <= 100")
    private BigDecimal discountPercent;

    @DecimalMin(value = "0.00", message = "discountAmount must be >= 0")
    private BigDecimal discountAmount;

    @Pattern(regexp = "^(PERCENTAGE|FIXED)?$", message = "discountType must be PERCENTAGE or FIXED")
    private String discountType;
}
