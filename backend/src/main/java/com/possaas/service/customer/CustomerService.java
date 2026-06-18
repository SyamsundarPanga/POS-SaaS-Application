package com.possaas.service.customer;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.possaas.config.TenantContext;
import com.possaas.domain.customer.Customer;
import com.possaas.domain.customer.CustomerStatus;
import com.possaas.domain.customer.LoyaltyTier;
import com.possaas.domain.customer.LoyaltyTransaction;
import com.possaas.domain.customer.LoyaltyTransactionType;
import com.possaas.dto.request.CreateCustomerRequest;
import com.possaas.dto.request.UpdateCustomerRequest;
import com.possaas.dto.response.CustomerDto;
import com.possaas.dto.response.CustomerExportDto;
import com.possaas.exception.DuplicateResourceException;
import com.possaas.exception.ResourceNotFoundException;
import com.possaas.repository.CustomerRepository;
import com.possaas.repository.LoyaltyTransactionRepository;
import com.possaas.service.audit.AuditLogService;
import com.possaas.service.security.AccessScopeService;
import com.possaas.service.tenant.SubscriptionService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final LoyaltyTransactionRepository loyaltyTransactionRepository;
    private final SubscriptionService subscriptionService;
    private final AuditLogService auditLogService;
    private final AccessScopeService accessScopeService;

    // Loyalty Configuration
    // Tier Thresholds (based on total purchases / orders)
    private static final int SILVER_THRESHOLD = 5;
    private static final int GOLD_THRESHOLD = 10;
    private static final BigDecimal REDEMPTION_VALUE = new BigDecimal("0.01"); // $0.01 per point

    // ================= CRUD OPERATIONS =================

    @Transactional(readOnly = true)
    public Page<CustomerDto> getAllCustomers(Pageable pageable, Long branchId) {
        String tenantId = TenantContext.getTenantId();
        var currentUser = accessScopeService.getCurrentUser();

        if (accessScopeService.isBranchScopedUser(currentUser)) {
            branchId = accessScopeService.getCurrentBranchIdRequired(currentUser);
        }

        Page<Customer> customers = branchId != null
                ? customerRepository.findDistinctByTenantIdAndBranchId(tenantId, branchId, pageable)
                : customerRepository.findByTenantIdAndIsDeletedFalse(tenantId, pageable);

        return customers
                .map(this::mapToDto);
    }

    @Transactional(readOnly = true)
    public CustomerDto getCustomerById(Long id) {
        String tenantId = TenantContext.getTenantId();
        Customer customer = customerRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with ID: " + id));
        return mapToDto(customer);
    }

    @Transactional(readOnly = true)
    public CustomerDto getCustomerByEmail(String email) {
        String tenantId = TenantContext.getTenantId();
        Customer customer = customerRepository.findByTenantIdAndEmail(tenantId, email)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with email: " + email));
        return mapToDto(customer);
    }

    @Transactional(readOnly = true)
    public CustomerDto getCustomerByPhone(String phone) {
        String tenantId = TenantContext.getTenantId();
        Customer customer = customerRepository.findByTenantIdAndPhone(tenantId, phone)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with phone: " + phone));
        return mapToDto(customer);
    }

    @Transactional(readOnly = true)
    public Page<CustomerDto> searchCustomers(String query, Pageable pageable) {
        String tenantId = TenantContext.getTenantId();
        return customerRepository.searchCustomers(tenantId, query, pageable)
                .map(this::mapToDto);
    }

    @Transactional
    public CustomerDto createCustomer(CreateCustomerRequest request) {
    	
    	subscriptionService.checkUserLimitAndIncrement();
        String tenantId = TenantContext.getTenantId();

        // Check for duplicate email
        if (request.getEmail() != null && customerRepository.existsByTenantIdAndEmail(tenantId, request.getEmail())) {
            throw new DuplicateResourceException("Customer with email " + request.getEmail() + " already exists");
        }

        // Check for duplicate phone
        if (request.getPhone() != null && customerRepository.existsByTenantIdAndPhone(tenantId, request.getPhone())) {
            throw new DuplicateResourceException("Customer with phone " + request.getPhone() + " already exists");
        }

        Customer customer = new Customer();
        customer.setFirstName(request.getFirstName());
        customer.setLastName(request.getLastName());
        customer.setEmail(request.getEmail());
        customer.setPhone(request.getPhone());
        customer.setGender(request.getGender());
        customer.setDateOfBirth(request.getDateOfBirth());
        customer.setAddress(request.getAddress());
        customer.setCity(request.getCity());
        customer.setState(request.getState());
        customer.setZipCode(request.getZipCode());
        customer.setCountry(request.getCountry());
        customer.setNotes(request.getNotes());
        customer.setEmailMarketingConsent(request.getEmailMarketingConsent());
        customer.setSmsMarketingConsent(request.getSmsMarketingConsent());
        
        // Generate unique referral code
        customer.setReferralCode(generateReferralCode());
        
        customer.setStatus(CustomerStatus.ACTIVE);
        customer.setLoyaltyTier(LoyaltyTier.BRONZE);

        Customer saved = customerRepository.save(customer);
        log.info("Created customer: {} {} (ID: {})", saved.getFirstName(), saved.getLastName(), saved.getId());
        auditLogService.log("CUSTOMER_CREATED", "CUSTOMER", saved.getId().toString(),
                "Created customer: " + saved.getFullName() + " (" + safeValue(saved.getEmail()) + ")");

        return mapToDto(saved);
    }

    @Transactional
    public CustomerDto updateCustomer(Long id, UpdateCustomerRequest request) {
    	   	
    	 subscriptionService.validateSubscriptionActive();
        String tenantId = TenantContext.getTenantId();
        Customer customer = customerRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with ID: " + id));

        // Check for duplicate email (if changed)
        if (request.getEmail() != null && !request.getEmail().equals(customer.getEmail())) {
            if (customerRepository.existsByTenantIdAndEmail(tenantId, request.getEmail())) {
                throw new DuplicateResourceException("Customer with email " + request.getEmail() + " already exists");
            }
            customer.setEmail(request.getEmail());
        }

        // Check for duplicate phone (if changed)
        if (request.getPhone() != null && !request.getPhone().equals(customer.getPhone())) {
            if (customerRepository.existsByTenantIdAndPhone(tenantId, request.getPhone())) {
                throw new DuplicateResourceException("Customer with phone " + request.getPhone() + " already exists");
            }
            customer.setPhone(request.getPhone());
        }

        if (request.getFirstName() != null) customer.setFirstName(request.getFirstName());
        if (request.getLastName() != null) customer.setLastName(request.getLastName());
        if (request.getGender() != null) customer.setGender(request.getGender());
        if (request.getDateOfBirth() != null) customer.setDateOfBirth(request.getDateOfBirth());
        if (request.getAddress() != null) customer.setAddress(request.getAddress());
        if (request.getCity() != null) customer.setCity(request.getCity());
        if (request.getState() != null) customer.setState(request.getState());
        if (request.getZipCode() != null) customer.setZipCode(request.getZipCode());
        if (request.getCountry() != null) customer.setCountry(request.getCountry());
        if (request.getNotes() != null) customer.setNotes(request.getNotes());
        if (request.getEmailMarketingConsent() != null) customer.setEmailMarketingConsent(request.getEmailMarketingConsent());
        if (request.getSmsMarketingConsent() != null) customer.setSmsMarketingConsent(request.getSmsMarketingConsent());

        Customer updated = customerRepository.save(customer);
        log.info("Updated customer: {} (ID: {})", updated.getFullName(), updated.getId());
        auditLogService.log("CUSTOMER_UPDATED", "CUSTOMER", updated.getId().toString(),
                "Updated customer: " + updated.getFullName() + " (" + safeValue(updated.getEmail()) + ")");

        return mapToDto(updated);
    }

    @Transactional
    public void deleteCustomer(Long id) {
    	
    	 
        String tenantId = TenantContext.getTenantId();
        subscriptionService.validateSubscriptionActive();
        Customer customer = customerRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with ID: " + id));

        customer.setStatus(CustomerStatus.DELETED);
        customer.setIsDeleted(true);
        customerRepository.save(customer);

        log.info("Soft deleted customer: {} (ID: {})", customer.getFullName(), customer.getId());
        auditLogService.log("CUSTOMER_DELETED", "CUSTOMER", customer.getId().toString(),
                "Deleted customer: " + customer.getFullName() + " (" + safeValue(customer.getEmail()) + ")");
    }

    // ================= LOYALTY POINTS MANAGEMENT =================

    @Transactional
    public void addLoyaltyPoints(Long customerId, Integer points, String reason, Long orderId) {
        String tenantId = TenantContext.getTenantId();
        Customer customer = customerRepository.findByIdAndTenantId(customerId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with ID: " + customerId));

        int previousPoints = customer.getLoyaltyPoints();
        customer.setLoyaltyPoints(previousPoints + points);
        customer.setTotalPointsEarned(customer.getTotalPointsEarned() + points);

        // Update tier if necessary
        updateLoyaltyTier(customer);

        customerRepository.save(customer);

        // Record transaction
        recordLoyaltyTransaction(customer, LoyaltyTransactionType.EARNED, points, reason, orderId);

        log.info("Added {} loyalty points to customer {} (ID: {}). New balance: {}", 
                points, customer.getFullName(), customerId, customer.getLoyaltyPoints());
        auditLogService.log("LOYALTY_POINTS_ADDED", "CUSTOMER", customer.getId().toString(),
                "Added " + points + " loyalty points to customer: " + customer.getFullName() + ". Reason: " + safeValue(reason));
    }

    @Transactional
    public void redeemLoyaltyPoints(Long customerId, Integer points, String reason, Long orderId) {
        String tenantId = TenantContext.getTenantId();
        Customer customer = customerRepository.findByIdAndTenantId(customerId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with ID: " + customerId));

        if (customer.getLoyaltyPoints() < points) {
            throw new IllegalArgumentException("Insufficient loyalty points. Available: " + 
                    customer.getLoyaltyPoints() + ", Requested: " + points);
        }

        int previousPoints = customer.getLoyaltyPoints();
        customer.setLoyaltyPoints(previousPoints - points);
        customer.setTotalPointsRedeemed(customer.getTotalPointsRedeemed() + points);

        customerRepository.save(customer);

        // Record transaction
        recordLoyaltyTransaction(customer, LoyaltyTransactionType.REDEEMED, points, reason, orderId);

        log.info("Redeemed {} loyalty points from customer {} (ID: {}). New balance: {}", 
                points, customer.getFullName(), customerId, customer.getLoyaltyPoints());
        auditLogService.log("LOYALTY_POINTS_REDEEMED", "CUSTOMER", customer.getId().toString(),
                "Redeemed " + points + " loyalty points from customer: " + customer.getFullName() + ". Reason: " + safeValue(reason));
    }

    @Transactional
    public void calculateAndAwardPointsForPurchase(Long customerId, BigDecimal purchaseAmount, Long orderId) {
        int pointsEarned = calculatePointsForAmount(purchaseAmount);
        if (pointsEarned > 0) {
            addLoyaltyPoints(customerId, pointsEarned, "Purchase reward", orderId);
        }
    }

    public int calculatePointsForAmount(BigDecimal amount) {
        return 1; // 1 point per order
    }

    public BigDecimal calculateRedemptionValue(Integer points) {
        return REDEMPTION_VALUE.multiply(BigDecimal.valueOf(points));
    }

    @Transactional(readOnly = true)
    public List<LoyaltyTransaction> getLoyaltyTransactionHistory(Long customerId) {
        String tenantId = TenantContext.getTenantId();
        return loyaltyTransactionRepository.findByTenantIdAndCustomerId(tenantId, customerId);
    }

    // ================= PURCHASE STATISTICS =================

    @Transactional
    public void updatePurchaseStatistics(Long customerId, BigDecimal orderAmount) {
        String tenantId = TenantContext.getTenantId();
        Customer customer = customerRepository.findByIdAndTenantId(customerId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with ID: " + customerId));

        customer.setTotalPurchases(customer.getTotalPurchases() + 1);
        customer.setTotalSpent(customer.getTotalSpent().add(orderAmount));
        
        // Calculate average order value
        BigDecimal avgOrderValue = customer.getTotalSpent()
                .divide(BigDecimal.valueOf(customer.getTotalPurchases()), 2, RoundingMode.HALF_UP);
        customer.setAverageOrderValue(avgOrderValue);

        customer.setLastPurchaseDate(LocalDateTime.now());
        
        if (customer.getFirstPurchaseDate() == null) {
            customer.setFirstPurchaseDate(LocalDateTime.now());
        }

        updateLoyaltyTier(customer);
        customerRepository.save(customer);
        log.info("Updated purchase statistics for customer {} (ID: {})", customer.getFullName(), customerId);
    }

    // ================= EXPORT =================

    @Transactional(readOnly = true)
    public byte[] exportCustomersToCsv(Long branchId) {
        String tenantId = TenantContext.getTenantId();
        var currentUser = accessScopeService.getCurrentUser();

        if (accessScopeService.isBranchScopedUser(currentUser)) {
            branchId = accessScopeService.getCurrentBranchIdRequired(currentUser);
        }

        List<Customer> customers = branchId != null
                ? customerRepository.findAllForExportByBranch(tenantId, branchId)
                : customerRepository.findAllForExport(tenantId);

        StringBuilder csv = new StringBuilder();
        csv.append("Customer Name,Email,Phone,Points Balance,Order Count\n");

        for (Customer customer : customers) {
            Long orderCount = customerRepository.countOrdersByCustomerId(customer.getId(), tenantId);
            CustomerExportDto exportDto = new CustomerExportDto(
                    buildFullName(customer.getFirstName(), customer.getLastName()),
                    customer.getEmail(),
                    customer.getPhone(),
                    customer.getLoyaltyPoints() != null ? customer.getLoyaltyPoints() : 0,
                    orderCount != null ? orderCount : 0L
            );

            csv.append(escapeCsv(exportDto.getCustomerName())).append(",")
               .append(escapeCsv(exportDto.getEmail())).append(",")
               .append(escapeCsv(exportDto.getPhone())).append(",")
               .append(exportDto.getLoyaltyPoints()).append(",")
               .append(exportDto.getOrderCount()).append("\n");
        }

        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    // ================= HELPER METHODS =================

    private void updateLoyaltyTier(Customer customer) {
        LoyaltyTier oldTier = customer.getLoyaltyTier();
        LoyaltyTier newTier = calculateTier(customer.getTotalPurchases());

        if (newTier != oldTier) {
            customer.setLoyaltyTier(newTier);
            customer.setTierUpdatedAt(LocalDateTime.now());
            log.info("Customer {} (ID: {}) tier upgraded from {} to {}", 
                    customer.getFullName(), customer.getId(), oldTier, newTier);
        }
    }

    private LoyaltyTier calculateTier(Integer totalPurchases) {
        if (totalPurchases >= GOLD_THRESHOLD) return LoyaltyTier.GOLD;
        if (totalPurchases >= SILVER_THRESHOLD) return LoyaltyTier.SILVER;
        return LoyaltyTier.BRONZE;
    }

    private void recordLoyaltyTransaction(Customer customer, LoyaltyTransactionType type, 
                                         Integer points, String reason, Long orderId) {
        int pointsBefore = customer.getLoyaltyPoints() - (type == LoyaltyTransactionType.EARNED ? points : -points);
        
        LoyaltyTransaction transaction = new LoyaltyTransaction();
        transaction.setCustomerId(customer.getId());
        transaction.setTransactionType(type);
        transaction.setPoints(points);
        transaction.setPointsBefore(pointsBefore);
        transaction.setPointsAfter(customer.getLoyaltyPoints());
        transaction.setTierBefore(customer.getLoyaltyTier().name());
        transaction.setTierAfter(customer.getLoyaltyTier().name());
        transaction.setDescription(reason);
        transaction.setOrderId(orderId);
        transaction.setReferenceType(orderId != null ? "ORDER" : "MANUAL_ADJUSTMENT");
        transaction.setReferenceId(orderId);
        
        loyaltyTransactionRepository.save(transaction);
    }

    private String escapeCsv(String value) {
        if (value == null) {
            return "";
        }
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    private String buildFullName(String firstName, String lastName) {
        String first = firstName != null ? firstName.trim() : "";
        String last = lastName != null ? lastName.trim() : "";
        String full = (first + " " + last).trim();
        return full.isEmpty() ? "Unknown" : full;
    }

    private String safeValue(String value) {
        return value == null || value.isBlank() ? "N/A" : value;
    }

    private String generateReferralCode() {
        return "REF-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    private CustomerDto mapToDto(Customer customer) {
        CustomerDto dto = new CustomerDto();
        dto.setId(customer.getId());
        dto.setTenantId(customer.getTenantId());
        dto.setFirstName(customer.getFirstName());
        dto.setLastName(customer.getLastName());
        dto.setFullName(customer.getFullName());
        dto.setEmail(customer.getEmail());
        dto.setPhone(customer.getPhone());
        dto.setGender(customer.getGender());
        dto.setDateOfBirth(customer.getDateOfBirth());
        dto.setAddress(customer.getAddress());
        dto.setCity(customer.getCity());
        dto.setState(customer.getState());
        dto.setZipCode(customer.getZipCode());
        dto.setCountry(customer.getCountry());
        dto.setLoyaltyPoints(customer.getLoyaltyPoints());
        dto.setTotalPointsEarned(customer.getTotalPointsEarned());
        dto.setTotalPointsRedeemed(customer.getTotalPointsRedeemed());
        dto.setLoyaltyTier(customer.getLoyaltyTier());
        dto.setTierUpdatedAt(customer.getTierUpdatedAt());
        dto.setTotalPurchases(customer.getTotalPurchases());
        dto.setTotalSpent(customer.getTotalSpent());
        dto.setAverageOrderValue(customer.getAverageOrderValue());
        dto.setLastPurchaseDate(customer.getLastPurchaseDate());
        dto.setFirstPurchaseDate(customer.getFirstPurchaseDate());
        dto.setStatus(customer.getStatus());
        dto.setNotes(customer.getNotes());
        dto.setEmailMarketingConsent(customer.getEmailMarketingConsent());
        dto.setSmsMarketingConsent(customer.getSmsMarketingConsent());
        dto.setReferralCode(customer.getReferralCode());
        dto.setIsVip(customer.isVip());
        dto.setCreatedAt(customer.getCreatedAt());
        dto.setUpdatedAt(customer.getUpdatedAt());
        return dto;
    }
}
