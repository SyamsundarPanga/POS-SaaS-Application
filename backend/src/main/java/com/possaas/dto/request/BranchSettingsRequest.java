package com.possaas.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BranchSettingsRequest {
    
    private Map<String, String> openingHours; // e.g., {"MONDAY": "09:00-18:00", "TUESDAY": "09:00-18:00"}
    
    @NotNull(message = "Tax rate is required")
    private BigDecimal taxRate;
    
    private String receiptTemplate;
    
    private List<String> paymentMethods; // e.g., ["CASH", "CARD", "UPI"]
    
    @NotNull(message = "Low stock threshold is required")
    private Integer lowStockThreshold;

    private Boolean discountEnabled;

    private BigDecimal maxDiscountPercent;

    private Boolean requireManagerApproval;
}
