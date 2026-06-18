package com.possaas.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import com.possaas.domain.order.OrderStatus;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor  
@AllArgsConstructor
public class OrderDto {
    private Long id;
    private String orderNumber;
    private BigDecimal subtotal;
    private BigDecimal tax;
    private BigDecimal total;
    private OrderStatus status;
    private LocalDateTime createdAt;
    private String cashierName;
    private String customerName;
    private String customerEmail;
    private String discountType;
    private BigDecimal discountPercent;
    private BigDecimal discountAmount;
    private BigDecimal subtotalBeforeDiscount;
    private BigDecimal taxableAmount;
    private BigDecimal taxAmount;
    private BigDecimal finalTotal;
    private List<OrderLineItemDto> lineItems;
    private List<OrderLineItemDto> originalLineItems;
    private List<PaymentDto> payments;
 // BE-06: Include Payment details
    private String paymentMethod;
    private String paymentStatus;
    private Long shiftId;
    private String shiftStatus;
}
