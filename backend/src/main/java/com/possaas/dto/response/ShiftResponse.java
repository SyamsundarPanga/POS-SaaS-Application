package com.possaas.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShiftResponse {
    private Long id;
    private Long employeeId;
    private String employeeName;
    private Long branchId;
    private String branchName;
    private LocalDateTime shiftStart;
    private LocalDateTime shiftEnd;
    private BigDecimal startingCash;
    private BigDecimal finalCash;
    private String status; // OPEN, CLOSED
    private String notes;
}
