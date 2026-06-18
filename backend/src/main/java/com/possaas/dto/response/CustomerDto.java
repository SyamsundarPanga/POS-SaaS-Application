package com.possaas.dto.response;

import com.possaas.domain.customer.CustomerStatus;
import com.possaas.domain.customer.LoyaltyTier;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class CustomerDto {
    private Long id;
    private String tenantId;
    private String firstName;
    private String lastName;
    private String fullName;
    private String email;
    private String phone;
    private String gender;
    private LocalDate dateOfBirth;
    private Integer age;
    private String address;
    private String city;
    private String state;
    private String zipCode;
    private String country;
    
    // Loyalty Information
    private Integer loyaltyPoints;
    private Integer totalPointsEarned;
    private Integer totalPointsRedeemed;
    private LoyaltyTier loyaltyTier;
    private String loyaltyTierName;
    private Double cashbackPercentage;
    private Integer pointsToNextTier;
    private LoyaltyTier nextTier;
    private LocalDateTime tierUpdatedAt;
    private Boolean isVip;
    
    // Purchase Statistics
    private Integer totalPurchases;
    private BigDecimal totalSpent;
    private BigDecimal averageOrderValue;
    private LocalDateTime lastPurchaseDate;
    private LocalDateTime firstPurchaseDate;
    
    // Status
    private CustomerStatus status;
    private String notes;
    
    // Marketing
    private Boolean emailMarketingConsent;
    private Boolean smsMarketingConsent;
    
    // Referral
    private Long referredByCustomerId;
    private String referredByCustomerName;
    private String referralCode;
    
    // Audit
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Boolean isDeleted;
}
