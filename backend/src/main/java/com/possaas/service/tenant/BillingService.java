package com.possaas.service.tenant;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.possaas.config.TenantContext;
import com.possaas.domain.tenant.Invoice;
import com.possaas.domain.tenant.InvoiceStatus;
import com.possaas.domain.tenant.Subscription;
import com.possaas.domain.tenant.SubscriptionStatus;
import com.possaas.domain.tenant.Tenant;
import com.possaas.repository.InvoiceRepository;
import com.possaas.repository.SubscriptionRepository;
import com.possaas.repository.TenantRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class BillingService {

    private final TenantRepository tenantRepository;
    private final InvoiceRepository invoiceRepository;
    private final SubscriptionRepository subscriptionRepository;

    // ===============================
    // GET INVOICES
    // ===============================

    public Page<Invoice> getInvoicesForCurrentTenant(Pageable pageable) {

        String tenantId = TenantContext.getTenantId();

        if (tenantId == null) {
            throw new RuntimeException("Tenant context not set");
        }

        return invoiceRepository.findByTenantId(tenantId, pageable);
    }

    // ===============================
    // GENERATE INVOICE
    // ===============================

    public Invoice generateInvoiceForCurrentTenant() {

        String tenantId = TenantContext.getTenantId();

        return generateMonthlyInvoice(tenantId);
    }

   
    public Invoice generateMonthlyInvoice(String tenantId) {

        Subscription subscription = subscriptionRepository
                .findByTenantId(tenantId)
                .orElseThrow(() ->
                        new RuntimeException("Subscription not found"));

        if (subscription.getPlan() == null) {
            throw new RuntimeException("No subscription plan assigned");
        }

        Invoice invoice = new Invoice();

        invoice.setTenantId(tenantId);
        invoice.setInvoiceNumber("INV_" + UUID.randomUUID());

        // ✅ FIXED: get price from subscription
        invoice.setAmount(subscription.getPlan().getMonthlyPrice());

        invoice.setBillingStart(LocalDate.now().minusMonths(1));
        invoice.setBillingEnd(LocalDate.now());

        invoice.setStatus(InvoiceStatus.PENDING);
        invoice.setDueDate(LocalDate.now().plusDays(7));
        invoice.setCreatedAt(LocalDateTime.now());

        return invoiceRepository.save(invoice);
    }

    
    @Transactional
    public void handleOverdueInvoices() {

        List<Invoice> overdueInvoices =
                invoiceRepository.findByStatusAndDueDateBefore(
                        InvoiceStatus.PENDING,
                        LocalDate.now()
                );

        for (Invoice invoice : overdueInvoices) {

            invoice.setStatus(InvoiceStatus.OVERDUE);

            Subscription subscription =
                    subscriptionRepository.findByTenantId(invoice.getTenantId())
                    .orElseThrow(() ->
                            new RuntimeException("Subscription not found"));

            subscription.setStatus(SubscriptionStatus.PAST_DUE);
        }
    }
    
    @Transactional
    public Invoice generateSubscriptionInvoice(
            String tenantId,
            BigDecimal amount,
            LocalDateTime start,
            LocalDateTime end) {

        Invoice invoice = new Invoice();

        invoice.setTenantId(tenantId);
        invoice.setInvoiceNumber("INV_" + UUID.randomUUID());
        invoice.setAmount(amount);
        invoice.setBillingStart(start.toLocalDate());
        invoice.setBillingEnd(end.toLocalDate());
        invoice.setStatus(InvoiceStatus.PENDING);
        invoice.setDueDate(LocalDate.now().plusDays(7));
        invoice.setCreatedAt(LocalDateTime.now());

        return invoiceRepository.save(invoice);
    }
    public Invoice getInvoiceByIdForCurrentTenant(Long id) {

        String tenantId = TenantContext.getTenantId();

        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Invoice not found"));

        if (!invoice.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Unauthorized access to invoice");
        }

        return invoice;
    }
    
    public void payInvoiceForCurrentTenant(Long id) {

        String tenantId = TenantContext.getTenantId();

        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Invoice not found"));

        if (!invoice.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Unauthorized access");
        }

        if (invoice.getStatus() == InvoiceStatus.PAID) {
            throw new RuntimeException("Invoice already paid");
        }

        invoice.setStatus(InvoiceStatus.PAID);

        Subscription subscription =
                subscriptionRepository.findByTenantId(tenantId)
                        .orElseThrow(() -> new RuntimeException("Subscription not found"));

        subscription.setStatus(SubscriptionStatus.ACTIVE);
    }
}
