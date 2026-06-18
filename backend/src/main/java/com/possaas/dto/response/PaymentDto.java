// backend/src/main/java/com/possaas/dto/response/PaymentDto.java
package com.possaas.dto.response;

import com.possaas.domain.payment.PaymentMethod;
import com.possaas.domain.payment.PaymentStatus;
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
public class PaymentDto {
    private Long id;
    private Long orderId;
    private PaymentMethod method;
    private BigDecimal amount;
    private BigDecimal amountTendered;
    private BigDecimal changeAmount;
    private PaymentStatus status;
    private String transactionId;
    private LocalDateTime createdAt;
   
}