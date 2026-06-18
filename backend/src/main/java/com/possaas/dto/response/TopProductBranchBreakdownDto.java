package com.possaas.dto.response;

import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TopProductBranchBreakdownDto {
    private Long branchId;
    private String branchName;
    private Integer unitsSold;
    private BigDecimal revenue;
}
