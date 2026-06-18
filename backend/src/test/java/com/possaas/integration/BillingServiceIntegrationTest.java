package com.possaas.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import com.possaas.config.TenantContext;
import com.possaas.domain.tenant.Invoice;
import com.possaas.domain.tenant.InvoiceStatus;
import com.possaas.domain.tenant.Subscription;
import com.possaas.domain.tenant.SubscriptionPlan;
import com.possaas.domain.tenant.SubscriptionPlanType;
import com.possaas.domain.tenant.SubscriptionStatus;
import com.possaas.domain.tenant.Tenant;
import com.possaas.repository.InvoiceRepository;
import com.possaas.repository.SubscriptionPlanRepository;
import com.possaas.repository.SubscriptionRepository;
import com.possaas.repository.TenantRepository;
import com.possaas.service.tenant.BillingService;

@Transactional
class BillingServiceIntegrationTest extends BaseIntegrationTest {

    @Autowired private BillingService billingService;
    @Autowired private TenantRepository tenantRepository;
    @Autowired private SubscriptionRepository subscriptionRepository;
    @Autowired private SubscriptionPlanRepository planRepository;
    @Autowired private InvoiceRepository invoiceRepository;

    private final String TENANT_A = "tenant-a";
    private final String TENANT_B = "tenant-b";

    @BeforeEach
    void setUp() {

        invoiceRepository.deleteAll();
        subscriptionRepository.deleteAll();
        tenantRepository.deleteAll();
        planRepository.deleteAll();

        // Seed Plan
        SubscriptionPlan plan = new SubscriptionPlan();
        plan.setId("BASIC");
        plan.setPlanType(SubscriptionPlanType.BASIC);
        plan.setMonthlyPrice(new BigDecimal("29.99"));
        plan.setMaxUsers(5);
        plan.setMaxBranches(1);
        plan.setMaxProducts(100);
        planRepository.saveAndFlush(plan);

        // Seed Tenant A
        Tenant tenantA = new Tenant();
        tenantA.setId(TENANT_A);
        tenantA.setName("Store A");
        tenantA.setSubscriptionPlan(plan);
        tenantA.setActive(true);
        tenantRepository.saveAndFlush(tenantA);

        // Seed Subscription A
        Subscription subA = new Subscription();
        subA.setTenantId(TENANT_A);
        subA.setPlan(plan);
        subA.setStatus(SubscriptionStatus.ACTIVE);
        subA.setStartDate(LocalDateTime.now());
        subscriptionRepository.saveAndFlush(subA);
    }

    @Test
    @DisplayName("Should generate monthly invoice correctly")
    void shouldGenerateMonthlyInvoice() {

        TenantContext.setTenantId(TENANT_A);

        Invoice invoice = billingService.generateInvoiceForCurrentTenant();

        assertThat(invoice).isNotNull();
        assertThat(invoice.getAmount()).isEqualByComparingTo("29.99");
        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.PENDING);
        assertThat(invoice.getTenantId()).isEqualTo(TENANT_A);
    }

    @Test
    @DisplayName("Should mark invoice as overdue and subscription as past due")
    void shouldHandleOverdueInvoices() {

        Invoice invoice = new Invoice();
        invoice.setTenantId(TENANT_A);
        invoice.setInvoiceNumber("INV-OLD");
        invoice.setAmount(new BigDecimal("29.99"));
        invoice.setDueDate(LocalDate.now().minusDays(1));
        invoice.setStatus(InvoiceStatus.PENDING);
        invoice.setCreatedAt(LocalDateTime.now());
        invoiceRepository.saveAndFlush(invoice);

        billingService.handleOverdueInvoices();

        Invoice updated = invoiceRepository.findById(invoice.getId()).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo(InvoiceStatus.OVERDUE);

        Subscription sub = subscriptionRepository.findByTenantId(TENANT_A).orElseThrow();
        assertThat(sub.getStatus()).isEqualTo(SubscriptionStatus.PAST_DUE);
    }

    @Test
    @DisplayName("Should prevent cross-tenant invoice access")
    void shouldEnforceTenantIsolation() {

        Invoice invoice = new Invoice();
        invoice.setTenantId(TENANT_B);
        invoice.setInvoiceNumber("INV-B");
        invoice.setAmount(BigDecimal.TEN);
        invoice.setStatus(InvoiceStatus.PENDING);
        invoice.setCreatedAt(LocalDateTime.now());
        invoice = invoiceRepository.saveAndFlush(invoice);

        TenantContext.setTenantId(TENANT_A);

        Long invoiceId = invoice.getId();

        assertThatThrownBy(() ->
                billingService.getInvoiceByIdForCurrentTenant(invoiceId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Unauthorized");
    }
}