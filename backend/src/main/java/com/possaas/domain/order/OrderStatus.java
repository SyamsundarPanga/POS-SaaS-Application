package com.possaas.domain.order;

public enum OrderStatus {
	CREATED,
    COMPLETED,
    VOID_REQUESTED,
    REFUND_REQUESTED,
    CANCELLED,
    PARTIAL_REFUND,
    REFUNDED,
    RETURNED
}
