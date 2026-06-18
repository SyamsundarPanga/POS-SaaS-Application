package com.possaas.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class CategoryDistributionResponse {
    private String categoryName;
    private Long count; // Or 'value'
}