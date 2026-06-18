package com.possaas.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LowStockAlertResponse {
    private Long id;
    private String name;
    private String sku;
    private Integer currentStock;
    private Integer threshold;
}
