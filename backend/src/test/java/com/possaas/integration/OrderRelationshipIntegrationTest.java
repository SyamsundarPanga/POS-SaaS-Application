package com.possaas.integration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import com.possaas.domain.user.Role;
import com.possaas.domain.user.UserStatus;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.util.ReflectionTestUtils;

import com.possaas.config.TenantContext;
import com.possaas.domain.order.Order;
import com.possaas.domain.order.OrderLineItem;
import com.possaas.domain.order.OrderStatus;
import com.possaas.domain.product.Product;
import com.possaas.domain.product.ProductStatus;
import com.possaas.domain.tenant.SubscriptionPlan;
import com.possaas.domain.tenant.SubscriptionPlanType;
import com.possaas.domain.tenant.Tenant;
import com.possaas.domain.user.User;
import com.possaas.repository.OrderRepository;
import com.possaas.repository.ProductRepository;
import com.possaas.repository.SubscriptionPlanRepository;
import com.possaas.repository.TenantRepository;
import com.possaas.repository.UserRepository;

class OrderRelationshipIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TenantRepository tenantRepository;

    @Autowired
    private SubscriptionPlanRepository subscriptionPlanRepository;

    private final String TEST_TENANT = "tenant-pos-123";

    private User user;
    private Product product;
    private SubscriptionPlan basicPlan;

    @BeforeEach
    void setup() {

        TenantContext.setTenantId(TEST_TENANT);

        // ✅ Ensure BASIC plan exists
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

        // ✅ Create tenant with plan
        if (!tenantRepository.existsById(TEST_TENANT)) {
            Tenant tenant = new Tenant();
            tenant.setId(TEST_TENANT);
            tenant.setName("Test Tenant");
            tenant.setSubscriptionPlan(basicPlan);
            tenant.setActive(true);
            tenantRepository.saveAndFlush(tenant);
        }

        user = new User();
        user.setUsername("cashier1");
        user.setEmail("cashier@test.com");
        user.setPassword("password");
        user.setRole(Role.ROLE_CASHIER);
        user.setStatus(UserStatus.ACTIVE);
        user.setTenantId(TEST_TENANT);
        userRepository.saveAndFlush(user);

        product = new Product();
        product.setName("Test Product");
        product.setSku("SKU-123");
        product.setPrice(new BigDecimal("100.00"));
        product.setStatus(ProductStatus.ACTIVE);
        product.setTenantId(TEST_TENANT);
        productRepository.saveAndFlush(product);
    }

    @Test
    void shouldNavigateOrderToLineItemsAndBack() {

        Order order = new Order();
        order.setOrderNumber("ORD-1001");
        order.setCashier(user);
        order.setUser(user);
        order.setSubtotal(new BigDecimal("100.00"));
        order.setTax(new BigDecimal("10.00"));
        order.setDiscount(BigDecimal.ZERO);
        order.setDiscountAmount(BigDecimal.ZERO);
        order.setDiscountPercent(BigDecimal.ZERO);
        order.setDiscountType("FIXED");
        order.setSubtotalBeforeDiscount(new BigDecimal("100.00"));
        order.setTaxableAmount(new BigDecimal("100.00"));
        order.setTaxAmount(new BigDecimal("10.00"));
        order.setFinalTotal(new BigDecimal("110.00"));
        order.setTotalAmount(new BigDecimal("110.00"));
        order.setStatus(OrderStatus.COMPLETED);
        order.setTenantId(TEST_TENANT);
        setRequiredFinancialFields(order, "100.00", "10.00", "110.00");

        OrderLineItem item = new OrderLineItem();
        item.setOrder(order);
        item.setProduct(product);
        item.setQuantity(1);
        item.setPrice(100.0);
        item.setDiscount(0.0);
        item.setLineTotal(100.0);
        item.setDiscountAmount(BigDecimal.ZERO);
        item.setDiscountPercent(BigDecimal.ZERO);
        item.setSubtotalBeforeDiscount(new BigDecimal("100.00"));
        item.setTaxableAmount(new BigDecimal("100.00"));
        item.setTaxAmount(BigDecimal.ZERO);
        item.setFinalTotal(new BigDecimal("100.00"));
        setRequiredLineItemFinancialFields(item, "100.00", "0.00", "100.00");

        List<OrderLineItem> items = new ArrayList<>();
        items.add(item);
        order.setLineItems(items);

        orderRepository.saveAndFlush(order);

        Order savedOrder = orderRepository.findById(order.getId()).orElseThrow();

        assertEquals(1, savedOrder.getLineItems().size());
        assertEquals(savedOrder.getId(),
                savedOrder.getLineItems().get(0).getOrder().getId());
    }

    @Test
    void shouldCascadePersistLineItemsWhenSavingOrder() {

        Order order = new Order();
        order.setOrderNumber("ORD-2001");
        order.setCashier(user);
        order.setUser(user);
        order.setSubtotal(new BigDecimal("200.00"));
        order.setTax(new BigDecimal("20.00"));
        order.setDiscount(BigDecimal.ZERO);
        order.setDiscountAmount(BigDecimal.ZERO);
        order.setDiscountPercent(BigDecimal.ZERO);
        order.setDiscountType("FIXED");
        order.setSubtotalBeforeDiscount(new BigDecimal("200.00"));
        order.setTaxableAmount(new BigDecimal("200.00"));
        order.setTaxAmount(new BigDecimal("20.00"));
        order.setFinalTotal(new BigDecimal("220.00"));
        order.setTotalAmount(new BigDecimal("220.00"));
        order.setStatus(OrderStatus.COMPLETED);
        order.setTenantId(TEST_TENANT);
        setRequiredFinancialFields(order, "200.00", "20.00", "220.00");

        OrderLineItem item = new OrderLineItem();
        item.setOrder(order);
        item.setProduct(product);
        item.setQuantity(2);
        item.setPrice(100.0);
        item.setDiscount(0.0);
        item.setLineTotal(200.0);
        item.setDiscountAmount(BigDecimal.ZERO);
        item.setDiscountPercent(BigDecimal.ZERO);
        item.setSubtotalBeforeDiscount(new BigDecimal("200.00"));
        item.setTaxableAmount(new BigDecimal("200.00"));
        item.setTaxAmount(BigDecimal.ZERO);
        item.setFinalTotal(new BigDecimal("200.00"));
        setRequiredLineItemFinancialFields(item, "200.00", "0.00", "200.00");

        order.setLineItems(List.of(item));

        Order savedOrder = orderRepository.saveAndFlush(order);

        assertNotNull(savedOrder.getId());
        assertNotNull(savedOrder.getLineItems().get(0).getId());

        Order reloaded = orderRepository.findById(savedOrder.getId()).orElseThrow();
        assertEquals(1, reloaded.getLineItems().size());
    }

    private void setRequiredFinancialFields(Order order, String subtotal, String tax, String finalTotal) {
        ReflectionTestUtils.setField(order, "discountAmount", BigDecimal.ZERO);
        ReflectionTestUtils.setField(order, "discountPercent", BigDecimal.ZERO);
        ReflectionTestUtils.setField(order, "discountType", "FIXED");
        ReflectionTestUtils.setField(order, "subtotalBeforeDiscount", new BigDecimal(subtotal));
        ReflectionTestUtils.setField(order, "taxableAmount", new BigDecimal(subtotal));
        ReflectionTestUtils.setField(order, "taxAmount", new BigDecimal(tax));
        ReflectionTestUtils.setField(order, "finalTotal", new BigDecimal(finalTotal));
    }

    private void setRequiredLineItemFinancialFields(OrderLineItem item, String subtotal, String tax, String finalTotal) {
        ReflectionTestUtils.setField(item, "discountAmount", BigDecimal.ZERO);
        ReflectionTestUtils.setField(item, "discountPercent", BigDecimal.ZERO);
        ReflectionTestUtils.setField(item, "subtotalBeforeDiscount", new BigDecimal(subtotal));
        ReflectionTestUtils.setField(item, "taxableAmount", new BigDecimal(subtotal));
        ReflectionTestUtils.setField(item, "taxAmount", new BigDecimal(tax));
        ReflectionTestUtils.setField(item, "finalTotal", new BigDecimal(finalTotal));
    }
}
