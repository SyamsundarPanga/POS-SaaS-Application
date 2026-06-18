package com.possaas.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class UserDto {

    private Long id;
    private String username;
    private String email;
    private String firstName;
    private String lastName;
    private String role;
    private String status;
    private Long branchId;
    private String branchName;
    private String tenantId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Metrics for Employee Management
    private java.math.BigDecimal totalSales;
    private java.math.BigDecimal todaySales;
    private Long shiftCount;
}
