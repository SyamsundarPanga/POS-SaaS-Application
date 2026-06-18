package com.possaas.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BranchPerformanceResponse {
    private Long branchId;
    private String branchName;
    private BigDecimal revenue;
    private Integer transactions;
    private BigDecimal averageOrderValue;
}