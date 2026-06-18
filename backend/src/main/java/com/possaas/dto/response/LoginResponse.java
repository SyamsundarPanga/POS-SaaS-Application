package com.possaas.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
public class LoginResponse {
	private String accessToken;
	private String refreshToken;
	private String tokenType;
	private Long userId;
	private String username;
	private String email;
	private String tenantId;
	private String storeName;
	private List<String> roles;
	private boolean isEmailVerified;
	private String accessMode; // FULL_ACCESS | BILLING_ONLY | NO_ACCESS
	private String subscriptionStatus;
	private LocalDateTime dataRetentionUntil;

}
