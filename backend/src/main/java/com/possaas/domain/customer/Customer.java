package com.possaas.domain.customer;

import com.possaas.domain.base.AuditableEntity;
import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "customers",
        indexes = {
                @Index(name = "idx_customer_tenant_email", columnList = "tenant_id, email"),
                @Index(name = "idx_customer_tenant_phone", columnList = "tenant_id, phone"),
                @Index(name = "idx_customer_tenant_status", columnList = "tenant_id, status"),
                @Index(name = "idx_customer_loyalty_tier", columnList = "tenant_id, loyalty_tier")
        },
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_customer_tenant_email", columnNames = {"tenant_id", "email"}),
                @UniqueConstraint(name = "uk_customer_tenant_phone", columnNames = {"tenant_id", "phone"})
        }
)
@Data
@EqualsAndHashCode(callSuper = true)
public class Customer extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String firstName;

    @Column(nullable = false, length = 100)
    private String lastName;

    @Column(unique = true, length = 150)
    private String email;

    @Column(unique = true, length = 20)
    private String phone;

    @Column(length = 10)
    private String gender; // MALE, FEMALE, OTHER

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(length = 500)
    private String address;

    @Column(length = 100)
    private String city;

    @Column(length = 100)
    private String state;

    @Column(length = 20)
    private String zipCode;

    @Column(length = 50)
    private String country;

    // Loyalty Program Fields
    @Column(name = "loyalty_points", nullable = false)
    private Integer loyaltyPoints = 0;

    @Column(name = "total_points_earned", nullable = false)
    private Integer totalPointsEarned = 0;

    @Column(name = "total_points_redeemed", nullable = false)
    private Integer totalPointsRedeemed = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "loyalty_tier", nullable = false, length = 20)
    private LoyaltyTier loyaltyTier = LoyaltyTier.BRONZE;

    @Column(name = "tier_updated_at")
    private LocalDateTime tierUpdatedAt;

    // Purchase Statistics
    @Column(name = "total_purchases", nullable = false)
    private Integer totalPurchases = 0;

    @Column(name = "total_spent", nullable = false, precision = 12, scale = 2)
    private java.math.BigDecimal totalSpent = java.math.BigDecimal.ZERO;

    @Column(name = "average_order_value", precision = 10, scale = 2)
    private java.math.BigDecimal averageOrderValue = java.math.BigDecimal.ZERO;

    @Column(name = "last_purchase_date")
    private LocalDateTime lastPurchaseDate;

    @Column(name = "first_purchase_date")
    private LocalDateTime firstPurchaseDate;

    // Customer Status
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CustomerStatus status = CustomerStatus.ACTIVE;

    @Column(length = 500)
    private String notes;

    // Marketing Preferences
    @Column(name = "email_marketing_consent")
    private Boolean emailMarketingConsent = false;

    @Column(name = "sms_marketing_consent")
    private Boolean smsMarketingConsent = false;

    // Referral
    @Column(name = "referred_by_customer_id")
    private Long referredByCustomerId;

    @Column(name = "referral_code", unique = true, length = 20)
    private String referralCode;

    // Computed Properties
    @Transient
    public String getFullName() {
        return firstName + " " + lastName;
    }

    @Transient
    public boolean isVip() {
        return loyaltyTier == LoyaltyTier.GOLD;
    }

    @Transient
    public Integer getAge() {
        if (dateOfBirth == null) {
            return null;
        }
        return LocalDate.now().getYear() - dateOfBirth.getYear();
    }
}
