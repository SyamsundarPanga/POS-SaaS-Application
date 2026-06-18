package com.possaas.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class UpdateSubscriptionPaymentMethodRequest {
    @NotBlank
    private String razorpayOrderId;
    @NotBlank
    private String razorpayPaymentId;
    @NotBlank
    private String razorpaySignature;
    @Pattern(regexp = "^[0-9]{4}$", message = "last4 must be 4 digits")
    private String last4;
    private String brand;
}
