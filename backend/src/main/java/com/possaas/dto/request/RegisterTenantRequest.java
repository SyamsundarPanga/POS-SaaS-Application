package com.possaas.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import com.possaas.domain.tenant.SubscriptionPlanType;

import lombok.Data;

@Data
public class RegisterTenantRequest {
    
    @NotBlank(message = "Store name is required")
    @Size(min = 3, max = 100, message = "Store name must be between 3 and 100 characters")
    @Pattern(regexp = "^[a-zA-Z0-9\\s-_]+$", message = "Store name can only contain letters, numbers, spaces, hyphens and underscores")
    private String storeName;

    @NotBlank(message = "Admin username is required")
    @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
    @Pattern(regexp = "^[a-zA-Z0-9_-]+$", message = "Username can only contain letters, numbers, hyphens and underscores")
    private String adminUsername;

    @NotBlank(message = "Admin email is required")
    @Email(message = "Please provide a valid email address")
    @Size(max = 100, message = "Email must not exceed 100 characters")
    private String adminEmail;

    @NotBlank(message = "Admin password is required")
    @Size(min = 8, max = 100, message = "Password must be between 8 and 100 characters")
    @Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#])[A-Za-z\\d@$!%*?&#]+$",
        message = "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character (@$!%*?&#)"
    )
    private String adminPassword;

    private SubscriptionPlanType plan = SubscriptionPlanType.BASIC;
}
