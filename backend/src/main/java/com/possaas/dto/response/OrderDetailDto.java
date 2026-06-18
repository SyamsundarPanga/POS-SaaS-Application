package com.possaas.dto.response;

import com.possaas.domain.order.OrderStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor  
@AllArgsConstructor
public class OrderDetailDto {
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
    
    // Payment details (for backward compatibility with single payment)
    private String paymentMethod;
    private String paymentStatus;
    private Double paidAmount;
    private BigDecimal amountTendered;
    private BigDecimal changeAmount;
    
    // Multiple payments support
    private List<PaymentDto> payments;
}
