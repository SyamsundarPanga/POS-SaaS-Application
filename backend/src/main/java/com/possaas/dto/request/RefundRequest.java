package com.possaas.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class RefundRequest {
    @NotNull(message = "Order ID is required")
    private Long orderId;
    
    @NotBlank(message = "Reason is required")
    private String reason;
    
    private String customReason;
    
    @NotNull(message = "Refund amount is required")
    private java.math.BigDecimal refundAmount;
    
    private String managerPin;
    
    private List<RefundItemRequest> items;
}
