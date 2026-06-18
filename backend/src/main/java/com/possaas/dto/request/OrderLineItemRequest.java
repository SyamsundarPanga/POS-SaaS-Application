package com.possaas.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor // This fixes the compilation error
@NoArgsConstructor
public class OrderLineItemRequest {
	
	@Schema(description = "ID of the product", example = "50")
    @NotNull(message = "Product ID is required")
    private Long productId;

	@Schema(description = "Quantity to purchase", example = "2")
    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be at least 1")
    private Integer quantity;
	
}
