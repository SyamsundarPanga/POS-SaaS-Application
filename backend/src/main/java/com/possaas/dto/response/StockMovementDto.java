package com.possaas.dto.response;

import com.possaas.domain.inventory.StockMovementType;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class StockMovementDto {

    private Long id;
    private Long productId;
    private String productName;
    private String productSku;
    private Long branchId;
    private String branchName;
    private StockMovementType movementType;
    private Integer quantity;
    private Long referenceId;
    private String referenceType;
    private String notes;
    private Long performedBy;
    private String performedByName;
    private Integer previousQuantity;
    private Integer newQuantity;
    private String tenantId;
    private LocalDateTime createdAt;
}
