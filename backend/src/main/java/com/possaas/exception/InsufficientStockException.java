package com.possaas.exception;

public class InsufficientStockException extends RuntimeException {

    public InsufficientStockException(String message) {
        super(message);
    }

    public InsufficientStockException(Long productId, int available, int requested) {
        super(
        		"Insufficient stock for productId=" + productId +
            "'. Available: " + available +
            ", Requested: " + requested
        );
    }
    
}
