package com.possaas.controller;

import java.util.List;
import java.time.LocalDate;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.possaas.domain.customer.LoyaltyTransaction;
import com.possaas.dto.request.CreateCustomerRequest;
import com.possaas.dto.request.UpdateCustomerRequest;
import com.possaas.dto.response.CustomerDto;
import com.possaas.service.customer.CustomerService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
@Tag(name = "Customer Management", description = "APIs for managing customers and loyalty program")
public class CustomerController {

    private final CustomerService customerService;

    @GetMapping
    @PreAuthorize("hasAnyRole('STORE_ADMIN', 'BRANCH_MANAGER', 'CASHIER')")
    @Operation(summary = "Get all customers", description = "Retrieve paginated list of customers")
    public ResponseEntity<Page<CustomerDto>> getAllCustomers(
            @RequestParam(required = false) Long branchId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(customerService.getAllCustomers(pageable, branchId));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('STORE_ADMIN', 'BRANCH_MANAGER', 'CASHIER')")
    @Operation(summary = "Get customer by ID")
    public ResponseEntity<CustomerDto> getCustomerById(@PathVariable Long id) {
        return ResponseEntity.ok(customerService.getCustomerById(id));
    }

    @GetMapping("/email/{email}")
    @PreAuthorize("hasAnyRole('STORE_ADMIN', 'BRANCH_MANAGER', 'CASHIER')")
    @Operation(summary = "Get customer by email")
    public ResponseEntity<CustomerDto> getCustomerByEmail(@PathVariable String email) {
        return ResponseEntity.ok(customerService.getCustomerByEmail(email));
    }

    @GetMapping("/phone/{phone}")
    @PreAuthorize("hasAnyRole('STORE_ADMIN', 'BRANCH_MANAGER', 'CASHIER')")
    @Operation(summary = "Get customer by phone")
    public ResponseEntity<CustomerDto> getCustomerByPhone(@PathVariable String phone) {
        return ResponseEntity.ok(customerService.getCustomerByPhone(phone));
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('STORE_ADMIN', 'BRANCH_MANAGER', 'CASHIER')")
    @Operation(summary = "Search customers", description = "Search by name, email, or phone")
    public ResponseEntity<Page<CustomerDto>> searchCustomers(
            @RequestParam String query,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(customerService.searchCustomers(query, pageable));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('STORE_ADMIN', 'BRANCH_MANAGER', 'CASHIER')")
    @Operation(summary = "Create new customer")
    public ResponseEntity<CustomerDto> createCustomer(@Valid @RequestBody CreateCustomerRequest request) {
        return ResponseEntity.status(201).body(customerService.createCustomer(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('STORE_ADMIN', 'BRANCH_MANAGER')")
    @Operation(summary = "Update customer")
    public ResponseEntity<CustomerDto> updateCustomer(
            @PathVariable Long id,
            @Valid @RequestBody UpdateCustomerRequest request) {
        return ResponseEntity.ok(customerService.updateCustomer(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('STORE_ADMIN')")
    @Operation(summary = "Delete customer (soft delete)")
    public ResponseEntity<Void> deleteCustomer(@PathVariable Long id) {
        customerService.deleteCustomer(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/export/csv")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Export customers to CSV")
    public ResponseEntity<byte[]> exportCustomersCsv(@RequestParam(required = false) Long branchId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        boolean allowed = false;
        if (authentication != null && authentication.isAuthenticated()) {
            for (GrantedAuthority authority : authentication.getAuthorities()) {
                String role = authority.getAuthority();
                if ("ROLE_STORE_ADMIN".equals(role) || "ROLE_BRANCH_MANAGER".equals(role)
                        || "STORE_ADMIN".equals(role) || "BRANCH_MANAGER".equals(role)) {
                    allowed = true;
                    break;
                }
            }
        }
        if (!allowed) {
            return ResponseEntity.status(403).build();
        }

        byte[] csvData = customerService.exportCustomersToCsv(branchId);

        String filename = "customers_" + LocalDate.now() + ".csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .header(HttpHeaders.CONTENT_TYPE, "text/csv; charset=UTF-8")
                .body(csvData);
    }

    // ================= LOYALTY POINTS ENDPOINTS =================

    @GetMapping("/{id}/loyalty-points")
    @PreAuthorize("hasAnyRole('STORE_ADMIN', 'BRANCH_MANAGER', 'CASHIER')")
    @Operation(summary = "Get customer loyalty points")
    public ResponseEntity<CustomerDto> getLoyaltyPoints(@PathVariable Long id) {
        return ResponseEntity.ok(customerService.getCustomerById(id));
    }

    @PostMapping("/{id}/loyalty-points/add")
    @PreAuthorize("hasAnyRole('STORE_ADMIN', 'BRANCH_MANAGER')")
    @Operation(summary = "Add loyalty points manually")
    public ResponseEntity<Void> addLoyaltyPoints(
            @PathVariable Long id,
            @RequestParam Integer points,
            @RequestParam(required = false) String reason) {
        customerService.addLoyaltyPoints(id, points, reason != null ? reason : "Manual adjustment", null);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/loyalty-points/redeem")
    @PreAuthorize("hasAnyRole('STORE_ADMIN', 'BRANCH_MANAGER', 'CASHIER')")
    @Operation(summary = "Redeem loyalty points")
    public ResponseEntity<Void> redeemLoyaltyPoints(
            @PathVariable Long id,
            @RequestParam Integer points,
            @RequestParam(required = false) String reason) {
        customerService.redeemLoyaltyPoints(id, points, reason != null ? reason : "Points redemption", null);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/loyalty-history")
    @PreAuthorize("hasAnyRole('STORE_ADMIN', 'BRANCH_MANAGER', 'CASHIER')")
    @Operation(summary = "Get loyalty transaction history")
    public ResponseEntity<List<LoyaltyTransaction>> getLoyaltyHistory(@PathVariable Long id) {
        return ResponseEntity.ok(customerService.getLoyaltyTransactionHistory(id));
    }

    // ================= CUSTOMER ORDERS =================

    @GetMapping("/{id}/orders")
    @PreAuthorize("hasAnyRole('STORE_ADMIN', 'BRANCH_MANAGER', 'CASHIER')")
    @Operation(summary = "Get customer order history")
    public ResponseEntity<String> getCustomerOrders(@PathVariable Long id) {
        // TODO: Implement when OrderService is ready
        return ResponseEntity.ok("Customer orders endpoint - to be implemented");
    }
}
