package com.possaas.domain.inventory;

public enum StockMovementType {
    SALE,              // Stock sold through POS
    RETURN,            // Customer return
    ADJUSTMENT,        // Manual adjustment (damage, theft, etc.)
    TRANSFER_IN,       // Stock received from another branch
    TRANSFER_OUT,      // Stock sent to another branch
    INITIAL_STOCK,     // Initial stock entry
    RESTOCK,           // Stock replenishment
    WRITE_OFF          // Stock written off (expired, damaged)
}
