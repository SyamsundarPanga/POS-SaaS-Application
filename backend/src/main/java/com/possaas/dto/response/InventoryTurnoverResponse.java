package com.possaas.dto.response;

import java.math.BigDecimal;

public record InventoryTurnoverResponse(
        Long productId,
        String productName,
        String sku,
        Integer beginningInventory,
        Integer endingInventory,
        Integer quantitySold,
        BigDecimal turnoverRatio,
        String turnoverFlag) {
}
