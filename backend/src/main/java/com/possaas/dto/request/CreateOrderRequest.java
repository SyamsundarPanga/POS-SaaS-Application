package com.possaas.dto.request;

import java.math.BigDecimal;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
@Schema(description="Request object for creating a new order")
public class CreateOrderRequest {

	@Schema(description="Unique Id of the customer placing the order (optional for walk-in customers)", 
	        example="1025", 
	        requiredMode=Schema.RequiredMode.NOT_REQUIRED)
    private Long customerId;  // Optional - null for walk-in customers

	@Schema(description="List of products and quantities included in the order")
    @NotEmpty(message = "Order must have at least one line item")
    @Valid
    private List<OrderLineItemRequest> items;
	
	@Schema(description = "Payment method: CASH, CARD or UPI (Razorpay)", 
	        example = "CASH",
	        allowableValues = {"CASH", "CARD", "UPI"})
    private String paymentMethod;

    @Schema(description = "Actual amount paid by customer", example = "150.00")
    private BigDecimal amountPaid;
    
    @Schema(description = "Customer email for order confirmation (optional)",
            example = "customer@gmail.com")
    private String customerEmail;  // Optional - for receipt

    @Schema(description = "Discount type", example = "PERCENTAGE", allowableValues = {"PERCENTAGE", "FIXED"})
    @Pattern(regexp = "^(PERCENTAGE|FIXED)?$", message = "discountType must be PERCENTAGE or FIXED")
    private String discountType;

    @Schema(description = "Discount percentage (0-100)", example = "10.00")
    @DecimalMin(value = "0.00", message = "discountPercent must be >= 0")
    @DecimalMax(value = "100.00", message = "discountPercent must be <= 100")
    private BigDecimal discountPercent;

    @Schema(description = "Fixed discount amount", example = "50.00")
    @DecimalMin(value = "0.00", message = "discountAmount must be >= 0")
    private BigDecimal discountAmount;

    @Schema(description = "Taxable amount after discount", example = "450.00")
    @DecimalMin(value = "0.00", message = "taxableAmount must be >= 0")
    private BigDecimal taxableAmount;

    @Schema(description = "Tax amount on taxable amount", example = "81.00")
    @DecimalMin(value = "0.00", message = "taxAmount must be >= 0")
    private BigDecimal taxAmount;

    @Schema(description = "Final total (taxable + tax)", example = "531.00")
    @DecimalMin(value = "0.00", message = "finalTotal must be >= 0")
    private BigDecimal finalTotal;

    @Schema(description = "Gateway tokenized payment reference (e.g. Razorpay payment id)", example = "pay_Nx1234abc")
    private String paymentReference;

    @Schema(description = "Branch ID where the order is placed (optional, will use shift/cashier branch if not provided)", example = "1")
    private Long branchId;
}
