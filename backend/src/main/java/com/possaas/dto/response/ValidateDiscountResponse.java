package com.possaas.dto.response;

import java.math.BigDecimal;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ValidateDiscountResponse {
    private boolean allowed;
    private BigDecimal maxAllowed;
    private String message;
}
