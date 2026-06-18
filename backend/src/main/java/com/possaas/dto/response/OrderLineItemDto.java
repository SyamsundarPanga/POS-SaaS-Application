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
public class OrderLineItemDto {
    private Long productId;
    private String productName;
    private String sku;
    private Integer quantity;
    private Double price;
    private Double discount;
    private Double lineTotal;
    private BigDecimal discountPercent;
    private BigDecimal discountAmount;
    private BigDecimal subtotalBeforeDiscount;
    private BigDecimal taxableAmount;
    private BigDecimal taxAmount;
    private BigDecimal finalTotal;
}
