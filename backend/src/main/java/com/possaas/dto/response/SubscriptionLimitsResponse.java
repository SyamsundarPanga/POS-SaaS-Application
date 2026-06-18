package com.possaas.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class SubscriptionLimitsResponse {

    private Integer maxUsers;
    private Integer maxBranches;
    private Integer maxProducts;
}