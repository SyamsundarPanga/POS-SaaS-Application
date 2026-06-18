package com.possaas.domain.order;

import com.possaas.config.TenantContext;
import com.possaas.domain.product.Product;
import org.junit.jupiter.api.*;

import static org.junit.jupiter.api.Assertions.*;

class OrderLineItemTest {

    private OrderLineItem lineItem;
    private final String TEST_TENANT = "tenant-pos-123";

    @BeforeEach
    void setUp() {
        TenantContext.setTenantId(TEST_TENANT);
        lineItem = new OrderLineItem();
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    @DisplayName("Should verify basic field setters and getters")
    void testBasicFields() {
        Order order = new Order();
        Product product = new Product();

        lineItem.setOrder(order);
        lineItem.setProduct(product);
        lineItem.setQuantity(2);
        lineItem.setPrice(250.0);
        lineItem.setLineTotal(500.0);

        assertEquals(order, lineItem.getOrder());
        assertEquals(product, lineItem.getProduct());
        assertEquals(2, lineItem.getQuantity());
        assertEquals(250.0, lineItem.getPrice());
        assertEquals(500.0, lineItem.getLineTotal());
    }

    @Test
    @DisplayName("Should assign tenantId from TenantContext")
    void testTenantAssignment() {
        lineItem.assignTenant();
        assertEquals(TEST_TENANT, lineItem.getTenantId());
    }

    @Test
    @DisplayName("Should verify line total calculation consistency")
    void testLineTotalCalculation() {
        lineItem.setQuantity(3);
        lineItem.setPrice(100.0);

        double expectedTotal = lineItem.getQuantity() * lineItem.getPrice();
        lineItem.setLineTotal(expectedTotal);

        assertEquals(300.0, lineItem.getLineTotal());
    }

    @Test
    @DisplayName("Should verify equality respects tenant isolation")
    void testEqualsAndHashCode() {
        OrderLineItem item1 = new OrderLineItem();
        item1.setId(1L);
        item1.setTenantId(TEST_TENANT);

        OrderLineItem item2 = new OrderLineItem();
        item2.setId(1L);
        item2.setTenantId(TEST_TENANT);

        assertEquals(item1, item2);
        assertEquals(item1.hashCode(), item2.hashCode());

        item2.setTenantId("another-tenant");
        assertNotEquals(item1, item2);
    }
}
