package com.possaas.domain.order;

import com.possaas.config.TenantContext;
import com.possaas.domain.user.User;
import org.junit.jupiter.api.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class OrderTest {

    private Order order;
    private final String TEST_TENANT = "tenant-pos-123";

    @BeforeEach
    void setUp() {
        TenantContext.setTenantId(TEST_TENANT);
        order = new Order();
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    @DisplayName("Should verify basic field setters and getters")
    void testBasicFields() {
        User dummyUser = new User();

        order.setOrderNumber("ORD-1001");
        order.setCashier(dummyUser);
        order.setUser(dummyUser);
        order.setSubtotal(new BigDecimal("400.00"));
        order.setTax(new BigDecimal("50.00"));
        
        // FIX: Use setTotalAmount(BigDecimal) instead of setTotal and Double values
        BigDecimal expectedTotal = new BigDecimal("450.00");
        order.setTotalAmount(expectedTotal);
        order.setStatus(OrderStatus.COMPLETED);

        assertEquals("ORD-1001", order.getOrderNumber());
        assertEquals(OrderStatus.COMPLETED, order.getStatus());
        
        // FIX: Compare BigDecimals (compareTo is safer than assertEquals for scale differences)
        assertNotNull(order.getTotalAmount());
        assertEquals(0, expectedTotal.compareTo(order.getTotalAmount()));
    }

    @Test
    @DisplayName("Should support all OrderStatus enum values")
    void testEnumValues() {
        OrderStatus[] allStatuses = {
                OrderStatus.CREATED,
                OrderStatus.COMPLETED,
                OrderStatus.VOID_REQUESTED,
                OrderStatus.CANCELLED,
                OrderStatus.PARTIAL_REFUND,
                OrderStatus.REFUNDED,
                OrderStatus.RETURNED
        };
        for (OrderStatus status : allStatuses) {
            order.setStatus(status);
            assertEquals(status, order.getStatus());
        }
    }

    @Test
    @DisplayName("Should assign tenantId from TenantContext during PrePersist phase")
    void testTenantAssignment() {
        // This simulates the @PrePersist callback logic
        order.assignTenant();
        assertEquals(TEST_TENANT, order.getTenantId());
    }

    @Test
    @DisplayName("Should manage line items relationship correctly")
    void testLineItemsRelationship() {
        OrderLineItem item = new OrderLineItem();
        item.setOrder(order);

        List<OrderLineItem> items = new ArrayList<>();
        items.add(item);

        order.setLineItems(items);

        assertEquals(1, order.getLineItems().size());
        assertEquals(order, order.getLineItems().get(0).getOrder());
    }

    @Test
    @DisplayName("Should verify equality respects tenant isolation")
    void testEqualsAndHashCode() {
        Order order1 = new Order();
        order1.setId(1L);
        order1.setTenantId(TEST_TENANT);

        Order order2 = new Order();
        order2.setId(1L);
        order2.setTenantId(TEST_TENANT);

        // Tests equality based on ID and TenantID (standard for Multi-tenant entities)
        assertEquals(order1, order2);
        assertEquals(order1.hashCode(), order2.hashCode());

        order2.setTenantId("different-tenant");
        assertNotEquals(order1, order2);
    }
}
