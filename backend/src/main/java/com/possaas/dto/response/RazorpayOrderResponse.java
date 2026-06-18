// backend/src/main/java/com/possaas/dto/response/RazorpayOrderResponse.java
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
public class RazorpayOrderResponse {
    private String id;
    private String entity;
    private BigDecimal amount;       // amount in rupees
    private BigDecimal amountPaid;   // amount paid in rupees
    private BigDecimal amountDue; 
    private String currency;
    private String receipt;
    private String status;
    private Integer attempts;
    private String keyId; // For frontend initialization
    private Long orderId; // Your system order ID
}