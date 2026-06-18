package com.possaas.domain.customer;

public enum LoyaltyTier {
    BRONZE(0, 4, 0.0),            // 0-4 orders
    SILVER(5, 9, 5.0),            // 5-9 orders, 5% discount
    GOLD(10, Integer.MAX_VALUE, 10.0), // 10+ orders, 10% discount
    PLATINUM(Integer.MAX_VALUE - 1, Integer.MAX_VALUE - 1, 15.0), // Legacy (unreachable)
    DIAMOND(Integer.MAX_VALUE, Integer.MAX_VALUE, 20.0);       // Legacy (unreachable)

    private final int minPoints;
    private final int maxPoints;
    private final double cashbackPercentage;

    LoyaltyTier(int minPoints, int maxPoints, double cashbackPercentage) {
        this.minPoints = minPoints;
        this.maxPoints = maxPoints;
        this.cashbackPercentage = cashbackPercentage;
    }

    public int getMinPoints() {
        return minPoints;
    }

    public int getMaxPoints() {
        return maxPoints;
    }

    public double getCashbackPercentage() {
        return cashbackPercentage;
    }

    public static LoyaltyTier getTierByPoints(int points) {
        for (LoyaltyTier tier : values()) {
            if (points >= tier.minPoints && points <= tier.maxPoints) {
                return tier;
            }
        }
        return BRONZE;
    }

    public LoyaltyTier getNextTier() {
        LoyaltyTier[] tiers = values();
        int currentIndex = this.ordinal();
        if (currentIndex < tiers.length - 1) {
            return tiers[currentIndex + 1];
        }
        return this; // Already at highest tier
    }

    public int getPointsToNextTier(int currentPoints) {
        LoyaltyTier nextTier = getNextTier();
        if (nextTier == this) {
            return 0; // Already at highest tier
        }
        return nextTier.minPoints - currentPoints;
    }
}
