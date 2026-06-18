package com.possaas.integration;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.List;
import java.util.TimeZone;
import java.util.UUID;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import com.possaas.domain.product.Product;
import com.possaas.domain.product.ProductStatus;
import com.possaas.domain.tenant.SubscriptionPlan;
import com.possaas.domain.tenant.SubscriptionPlanType;
import com.possaas.domain.tenant.Tenant;
import com.possaas.repository.ProductRepository;
import com.possaas.repository.SubscriptionPlanRepository;
import com.possaas.repository.TenantRepository;

@SpringBootTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class TenantSqlIsolationTest extends BaseIntegrationTest {

    @BeforeAll
    static void setUpTimezone() {
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
    }

    @Autowired private ProductRepository productRepository;
    @Autowired private TenantRepository tenantRepository;
    @Autowired private SubscriptionPlanRepository subscriptionPlanRepository;
    @Autowired private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    private SubscriptionPlan basicPlan;

    @BeforeEach
    void setUp() {

        productRepository.deleteAll();
        tenantRepository.deleteAll();

        // ✅ Create BASIC plan if not exists
        basicPlan = subscriptionPlanRepository
                .findById("BASIC")
                .orElseGet(() -> {
                    SubscriptionPlan plan = new SubscriptionPlan();
                    plan.setId("BASIC");
                    plan.setPlanType(SubscriptionPlanType.BASIC);
                    plan.setMaxBranches(1);
                    plan.setMaxUsers(10);
                    plan.setMaxProducts(100);
                    plan.setMonthlyPrice(BigDecimal.valueOf(999));
                    return subscriptionPlanRepository.save(plan);
                });
    }

    @Test
    void directSqlQueryRespectsTenantId() {

        // ---------------------------
        // Create Tenant A
        // ---------------------------
        Tenant t1 = new Tenant();
        t1.setName("TenantA_" + UUID.randomUUID());
        t1.setActive(true);
        t1.setSubscriptionPlan(basicPlan);
        String t1Id = tenantRepository.saveAndFlush(t1).getId();

        // ---------------------------
        // Create Tenant B
        // ---------------------------
        Tenant t2 = new Tenant();
        t2.setName("TenantB_" + UUID.randomUUID());
        t2.setActive(true);
        t2.setSubscriptionPlan(basicPlan);
        String t2Id = tenantRepository.saveAndFlush(t2).getId();

        // ---------------------------
        // Products for Tenant A
        // ---------------------------
        Product pA1 = new Product();
        pA1.setName("A1");
        pA1.setSku("A1-" + UUID.randomUUID().toString().substring(0, 6));
        pA1.setPrice(BigDecimal.valueOf(10));
        pA1.setStatus(ProductStatus.ACTIVE);
        pA1.setTenantId(t1Id);
        productRepository.save(pA1);

        Product pA2 = new Product();
        pA2.setName("A2");
        pA2.setSku("A2-" + UUID.randomUUID().toString().substring(0, 6));
        pA2.setPrice(BigDecimal.valueOf(20));
        pA2.setStatus(ProductStatus.ACTIVE);
        pA2.setTenantId(t1Id);
        productRepository.save(pA2);

        // ---------------------------
        // Products for Tenant B
        // ---------------------------
        Product pB1 = new Product();
        pB1.setName("B1");
        pB1.setSku("B1-" + UUID.randomUUID().toString().substring(0, 6));
        pB1.setPrice(BigDecimal.valueOf(30));
        pB1.setStatus(ProductStatus.ACTIVE);
        pB1.setTenantId(t2Id);
        productRepository.save(pB1);

        Product pB2 = new Product();
        pB2.setName("B2");
        pB2.setSku("B2-" + UUID.randomUUID().toString().substring(0, 6));
        pB2.setPrice(BigDecimal.valueOf(40));
        pB2.setStatus(ProductStatus.ACTIVE);
        pB2.setTenantId(t2Id);
        productRepository.save(pB2);

        // ---------------------------
        // Direct SQL Validation
        // ---------------------------

        Integer countForA = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM products WHERE tenant_id = ?",
                Integer.class, t1Id);

        Integer countForB = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM products WHERE tenant_id = ?",
                Integer.class, t2Id);

        assertThat(countForA).isEqualTo(2);
        assertThat(countForB).isEqualTo(2);

        List<?> rowsForA = jdbcTemplate.queryForList(
                "SELECT id, name, tenant_id FROM products WHERE tenant_id = ?",
                t1Id);

        for (Object row : rowsForA) {
            assertThat(row.toString()).contains(t1Id);
        }

        List<?> rowsForB = jdbcTemplate.queryForList(
                "SELECT id, name, tenant_id FROM products WHERE tenant_id = ?",
                t2Id);

        for (Object row : rowsForB) {
            assertThat(row.toString()).contains(t2Id);
        }
    }
}