package com.possaas.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.possaas.config.TenantContext;
import com.possaas.config.TenantFilterConfig;
import com.possaas.domain.customer.Customer;
import com.possaas.dto.request.CreateCustomerRequest;
import com.possaas.dto.request.UpdateCustomerRequest;
import com.possaas.repository.CustomerRepository;
import com.possaas.security.JwtAuthenticationFilter;
import com.possaas.security.TenantFilterInterceptor;
import com.possaas.service.tenant.SubscriptionService;

import jakarta.servlet.FilterChain;

class CustomerIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private CustomerRepository customerRepository;

    @MockBean
    private SubscriptionService subscriptionService;

    @MockBean
    private TenantFilterConfig tenantFilterConfig;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
    private TenantFilterInterceptor tenantFilterInterceptor;

    private static final String TEST_TENANT = "test-tenant";

    @BeforeEach
    void setup() throws Exception {
        // Set the context for both the test thread and the mock request
        TenantContext.setTenantId(TEST_TENANT);
        
        // Clear database before each test to prevent ID conflicts or count errors
        customerRepository.deleteAll();

        // Mock subscription validations to bypass business logic checks
        Mockito.doNothing().when(subscriptionService).checkUserLimitAndIncrement();
        Mockito.doNothing().when(subscriptionService).validateSubscriptionActive();

        // Mock security filters to pass through the filter chain
        Mockito.doAnswer(invocation -> {
            FilterChain filterChain = invocation.getArgument(2);
            filterChain.doFilter(invocation.getArgument(0), invocation.getArgument(1));
            return null;
        }).when(tenantFilterConfig).doFilter(Mockito.any(), Mockito.any(), Mockito.any());

        Mockito.doAnswer(invocation -> {
            FilterChain filterChain = invocation.getArgument(2);
            filterChain.doFilter(invocation.getArgument(0), invocation.getArgument(1));
            return null;
        }).when(jwtAuthenticationFilter).doFilter(Mockito.any(), Mockito.any(), Mockito.any());

        // Mock tenant interceptor to not clear TenantContext
        Mockito.when(tenantFilterInterceptor.preHandle(Mockito.any(), Mockito.any(), Mockito.any()))
                .thenReturn(true);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    @WithMockUser(roles = "STORE_ADMIN")
    void shouldCreateCustomerSuccessfully() throws Exception {
        CreateCustomerRequest request = new CreateCustomerRequest();
        request.setFirstName("John");
        request.setLastName("Doe");
        request.setEmail("john@test.com");
        request.setPhone("9999999999");
        request.setDateOfBirth(LocalDate.of(1995, 5, 10));

        mockMvc.perform(post("/api/customers")
                        .header("X-TenantID", TEST_TENANT) // Ensure your TenantInterceptor sees this
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.firstName").value("John"));
    }

    @Test
    @WithMockUser(roles = "STORE_ADMIN")
    void shouldGetCustomerById() throws Exception {
        Customer customer = new Customer();
        customer.setFirstName("Alice");
        customer.setLastName("Smith");
        customer.setEmail("alice@test.com");
        customer.setPhone("8888888888");
        customer.setTenantId(TEST_TENANT); // Database filter requires this to be present

        Customer saved = customerRepository.save(customer);

        mockMvc.perform(get("/api/customers/" + saved.getId())
                        .header("X-TenantID", TEST_TENANT))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("alice@test.com"));
    }

    @Test
    @WithMockUser(roles = "STORE_ADMIN")
    void shouldUpdateCustomer() throws Exception {
        Customer customer = new Customer();
        customer.setFirstName("Bob");
        customer.setLastName("Marley");
        customer.setEmail("bob@test.com");
        customer.setPhone("7777777777");
        customer.setTenantId(TEST_TENANT);

        Customer saved = customerRepository.save(customer);

        UpdateCustomerRequest updateRequest = new UpdateCustomerRequest();
        // Mandatory fields must be filled to avoid 400 Validation errors
        updateRequest.setFirstName("Bob"); 
        updateRequest.setLastName("Marley");
        updateRequest.setCity("Mumbai");

        mockMvc.perform(put("/api/customers/" + saved.getId())
                        .header("X-TenantID", TEST_TENANT)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.city").value("Mumbai"));
    }

    @Test
    @WithMockUser(roles = "STORE_ADMIN")
    void shouldAddLoyaltyPoints() throws Exception {
        Customer customer = new Customer();
        customer.setFirstName("Vip");
        customer.setLastName("User");
        customer.setPhone("6666666666");
        customer.setTenantId(TEST_TENANT);
        customer.setLoyaltyPoints(0);

        Customer saved = customerRepository.save(customer);

        mockMvc.perform(post("/api/customers/" + saved.getId() + "/loyalty-points/add")
                        .header("X-TenantID", TEST_TENANT)
                        .param("points", "100"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "STORE_ADMIN")
    void shouldSoftDeleteCustomer() throws Exception {
        Customer customer = new Customer();
        customer.setFirstName("Delete");
        customer.setLastName("User");
        customer.setPhone("5555555555");
        customer.setTenantId(TEST_TENANT);

        Customer saved = customerRepository.save(customer);

        mockMvc.perform(delete("/api/customers/" + saved.getId())
                        .header("X-TenantID", TEST_TENANT))
                .andExpect(status().isNoContent());

        Customer deleted = customerRepository.findById(saved.getId()).orElseThrow();
        assertThat(deleted.getIsDeleted()).isTrue();
    }
}