package com.possaas.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SubscriptionUsageResponse {

    private int maxUsers;
    private int maxBranches;
    private int maxProducts;

    private long currentUsers;
    private long currentBranches;
    private long currentProducts;

    private boolean branchLimitReached;
    private boolean productLimitReached;
    private boolean userLimitReached;
}