// backend/src/main/java/com/possaas/exception/PaymentProcessingException.java
package com.possaas.exception;

public class PaymentProcessingException extends RuntimeException {
    
    public PaymentProcessingException(String message) {
        super(message);
    }
    
    public PaymentProcessingException(String message, Throwable cause) {
        super(message, cause);
    }
}