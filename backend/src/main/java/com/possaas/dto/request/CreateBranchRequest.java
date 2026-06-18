package com.possaas.dto.request;

import java.math.BigDecimal;
import java.time.LocalTime;

import com.possaas.domain.branch.BranchStatus;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateBranchRequest {

    @NotBlank(message = "Branch code is required")
    @Size(max = 50, message = "Branch code must not exceed 50 characters")
    @Pattern(regexp = "^[A-Za-z0-9-_]+$", message = "Branch code must be alphanumeric with hyphens or underscores only")
    private String code;

    @NotBlank(message = "Branch name is required")
    @Size(max = 200, message = "Branch name must not exceed 200 characters")
    private String name;

    @Size(max = 500, message = "Address must not exceed 500 characters")
    private String address;

    @Size(max = 100, message = "City must not exceed 100 characters")
    private String city;

    @Size(max = 100, message = "State must not exceed 100 characters")
    private String state;

    @Size(max = 20, message = "Zip code must not exceed 20 characters")
    private String zipCode;

    @Size(max = 100, message = "Country must not exceed 100 characters")
    private String country;

    @Size(max = 20, message = "Phone must not exceed 20 characters")
    @Pattern(regexp = "^[0-9+\\-\\s()]*$", message = "Invalid phone number format")
    private String phone;

    @Email(message = "Invalid email format")
    @Size(max = 100, message = "Email must not exceed 100 characters")
    private String email;

    private BranchStatus status = BranchStatus.ACTIVE;

    private Long managerId;

//    @Pattern(regexp = "^([01]?[0-9]|2[0-3]):[0-5][0-9]$", message = "Opening time must be in HH:mm format")
    private LocalTime openingTime;

//    @Pattern(regexp = "^([01]?[0-9]|2[0-3]):[0-5][0-9]$", message = "Closing time must be in HH:mm format")
    private LocalTime closingTime;

    private BigDecimal taxRate;

    private Boolean isMainBranch = false;
}
