package com.possaas.domain.tenant;
public enum SubscriptionStatus {
	  PENDING_PAYMENT,   // waiting for payment
	    ACTIVE,            // subscription active
	    PAST_DUE,          // payment missed
	    EXPIRED,           // ended
	    CANCELLED,
	    GRACE_PERIOD
}