package com.possaas.dto.response;

import java.math.BigDecimal;

public record EmployeePerformanceResponse(
        Long userId,
        String employeeName,
        Long branchId,
        Integer ordersProcessed,
        BigDecimal totalRevenue,
        BigDecimal avgOrderValue) {
}
