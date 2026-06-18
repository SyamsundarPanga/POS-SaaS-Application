package com.possaas.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;

import com.possaas.domain.branch.BranchStatus;

import lombok.Data;

@Data
public class BranchDto {

    private Long id;
    private String code;
    private String name;
    private String address;
    private String city;
    private String state;
    private String zipCode;
    private String country;
    private String phone;
    private String email;
    private BranchStatus status;
    private Long managerId;
    private String managerName;
    private LocalTime openingTime;
    private LocalTime closingTime;
    private BigDecimal taxRate;
    private Boolean isMainBranch;
    private String tenantId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // Additional computed fields
    private Integer employeeCount;
    private Integer productCount;
    private BigDecimal totalSales;
}
