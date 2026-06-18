package com.possaas.dto.response;

import com.possaas.domain.customer.LoyaltyTransactionType;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class LoyaltyTransactionDto {
    private Long id;
    private String tenantId;
    private Long customerId;
    private String customerName;
    private Long orderId;
    private String orderNumber;
    private LoyaltyTransactionType transactionType;
    private Integer points;
    private BigDecimal orderAmount;
    private Integer pointsBefore;
    private Integer pointsAfter;
    private String tierBefore;
    private String tierAfter;
    private String description;
    private String referenceType;
    private Long referenceId;
    private Long performedBy;
    private String performedByName;
    private LocalDateTime createdAt;
}
