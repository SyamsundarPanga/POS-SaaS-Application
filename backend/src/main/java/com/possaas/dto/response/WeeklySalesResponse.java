package com.possaas.dto.response;

import java.math.BigDecimal;
import java.util.Date;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WeeklySalesResponse {
    private Date date; // The day of the sale
    private BigDecimal sales; // Total revenue for that day
    private Integer transactions; // Number of orders for that day
}