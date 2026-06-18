// backend/src/main/java/com/possaas/dto/request/VerifyRazorpayPaymentRequest.java
package com.possaas.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VerifyRazorpayPaymentRequest {
    
    @NotNull(message = "Razorpay order ID is required")
    private String razorpayOrderId;
    
    @NotNull(message = "Razorpay payment ID is required")
    private String razorpayPaymentId;
    
    @NotNull(message = "Razorpay signature is required")
    private String razorpaySignature;
    
    private Long orderId;
}