package com.possaas.dto.response;

import com.possaas.domain.order.OrderStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderSummaryDto {
    private Long id;
    private String orderNumber;
    private BigDecimal total;
    private BigDecimal subtotal;
    private BigDecimal tax;
    private BigDecimal discount;
    private LocalDateTime createdAt;
    private OrderStatus status;
    private String cashierName;
    private String customerName;
    private String customerEmail;
    private String paymentMethod;
    private java.util.List<PaymentDto> payments;
    private Integer itemCount;
    private java.util.List<OrderLineItemDto> items;
    private Long shiftId;
    private String shiftStatus;
}
