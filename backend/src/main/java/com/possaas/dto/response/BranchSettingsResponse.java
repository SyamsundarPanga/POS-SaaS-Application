package com.possaas.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BranchSettingsResponse {
    private Long id;
    private Long branchId;
    private String branchName;
    private Map<String, String> openingHours;
    private BigDecimal taxRate;
    private String receiptTemplate;
    private List<String> paymentMethods;
    private Integer lowStockThreshold;
    private Boolean discountEnabled;
    private BigDecimal maxDiscountPercent;
    private Boolean requireManagerApproval;
    private LocalDateTime updatedAt;
}
