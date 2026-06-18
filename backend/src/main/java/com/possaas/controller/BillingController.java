package com.possaas.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.possaas.domain.tenant.Invoice;
import com.possaas.service.tenant.BillingService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/billing")
@RequiredArgsConstructor

public class BillingController {

    private final BillingService billingService;

    // 1️⃣ Get invoices (paginated)
    @GetMapping("/invoices")
    @PreAuthorize("hasRole('ROLE_STORE_ADMIN')")
    public Page<Invoice> getInvoices(Pageable pageable) {
        return billingService.getInvoicesForCurrentTenant(pageable);
    }

    // 2️⃣ Get single invoice
    @PreAuthorize("hasRole('ROLE_STORE_ADMIN')")
    @GetMapping("/invoice/{id}")
    public Invoice getInvoice(@PathVariable Long id) {
        return billingService.getInvoiceByIdForCurrentTenant(id);
    }

    // 3️⃣ Generate invoice manually
    @PreAuthorize("hasRole('ROLE_STORE_ADMIN')")
    @PostMapping("/generate")
    public Invoice generateInvoice() {
        return billingService.generateInvoiceForCurrentTenant();
    }

    // 4️⃣ Pay invoice
    @PreAuthorize("hasRole('ROLE_STORE_ADMIN')")
    @PutMapping("/pay/{id}")
    public String payInvoice(@PathVariable Long id) {
        billingService.payInvoiceForCurrentTenant(id);
        return "Invoice marked as PAID";
    }

    // 5️⃣ Manual overdue check (admin tool)
    @PreAuthorize("hasRole('ROLE_STORE_ADMIN')")
    @PostMapping("/check-overdue")
    public String checkOverdueInvoices() {
        billingService.handleOverdueInvoices();
        return "Overdue invoices processed";
    }
}

