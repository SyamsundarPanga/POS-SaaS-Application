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
public class ActiveCashierResponse {
    private Long id;
    private String name;
    private LocalDateTime shiftStart;
    private Integer transactionsToday;
    private BigDecimal salesToday;
    private String status;
}
