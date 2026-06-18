package com.possaas.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PaymentAuditLogResponse(
        Long paymentId,
        String method,
        BigDecimal amount,
        String status,
        LocalDateTime timestamp,
        String gatewayReference,
        String orderNumber) {
}
