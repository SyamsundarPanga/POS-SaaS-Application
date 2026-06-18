package com.possaas.dto.response;

import lombok.Value;

@Value
public class CustomerExportDto {
    String customerName;
    String email;
    String phone;
    Integer loyaltyPoints;
    Long orderCount;
}
