package com.possaas.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockTransferResponse {
    private Long id;
    private Long productId;
    private String productName;
    private String productSku;
    private Long sourceBranchId;
    private String sourceBranchName;
    private Long destinationBranchId;
    private String destinationBranchName;
    private Integer quantity;
    private String status; // PENDING, COMPLETED, CANCELLED
    private String initiatedBy;
    private LocalDateTime createdAt;
    private String notes;
}
