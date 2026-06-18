package com.possaas.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TopProductResponse {
    private Long id;
    private String name;
    private String sku;
    private Integer quantitySold;
    private BigDecimal revenue;

    private Long productId;
    private String productName;
    private String imageUrl;
    private String categoryName;
    private Integer totalUnitsSold;
    private BigDecimal totalRevenue;
    private Integer rank;
    private List<TopProductBranchBreakdownDto> branchBreakdown;
}
