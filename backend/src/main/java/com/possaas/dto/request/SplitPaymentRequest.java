package com.possaas.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SplitPaymentRequest {
    
    @NotNull(message = "Customer ID is required")
    private Long customerId;
    
    @NotEmpty(message = "Line items are required")
    private List<OrderLineItemRequest> lineItems;
    
    @NotEmpty(message = "Payments are required")
    private List<PaymentDetail> payments;
    
    private String notes;
    
    // Discount fields
    private String discountType; // PERCENTAGE or FIXED
    private BigDecimal discountPercent;
    private BigDecimal discountAmount;
    
    private Long branchId;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentDetail {
        @NotNull(message = "Payment method is required")
        private String method; // CASH, CARD, UPI, etc.
        
        @NotNull(message = "Amount is required")
        private BigDecimal amount;
        
        private String transactionId;
        private String cardLast4;
    }
}
