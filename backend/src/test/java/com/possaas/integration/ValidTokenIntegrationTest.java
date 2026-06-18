package com.possaas.integration;

import com.possaas.config.TenantContext;
import com.possaas.security.service.UserDetailsImpl;
import com.possaas.service.auth.JwtTokenProvider;
import com.possaas.service.impl.UserDetailsServiceImpl; // 🔴 Import the concrete implementation
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ValidTokenIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    // 🔴 FIXED: Mock the specific class that SecurityConfig expects
    @MockBean
    private UserDetailsServiceImpl userDetailsService;

    private final String VALID_TOKEN = "eyJhbGciOiJIUzI1NiJ9.valid.token";
    private final String TEST_TENANT = "retail-hub-001";

    @BeforeEach
    void setUp() {
        TenantContext.clear();
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    @DisplayName("Verify TenantContext establishment by mocking concrete UserDetailsServiceImpl")
    void shouldBypassDbByMockingConcreteService() throws Exception {
        // 1. Arrange: Mock the JWT provider logic
        when(jwtTokenProvider.validateToken(anyString())).thenReturn(true);
        when(jwtTokenProvider.getUsername(anyString())).thenReturn("admin@retailhub.com");
        when(jwtTokenProvider.getTenantId(anyString())).thenReturn(TEST_TENANT);

        // 2. Arrange: Create your custom UserDetailsImpl
        UserDetailsImpl mockUserDetails = new UserDetailsImpl(
                1L,
                "admin@retailhub.com",
                "admin@retailhub.com",
                "password",
                TEST_TENANT,
                List.of(new SimpleGrantedAuthority("ROLE_STORE_ADMIN")));

        // 3. Mock the concrete service call to bypass the empty DB
        when(userDetailsService.loadUserByUsername("admin@retailhub.com")).thenReturn(mockUserDetails);

        // 4. Act & Assert: Call the validate endpoint
        mockMvc.perform(get("/api/auth/validate")
                .header("Authorization", "Bearer " + VALID_TOKEN)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true));

        // 5. Verify Context cleanup
        assertNull(TenantContext.getTenantIdOrNull(), "Context must be cleared after request");
    }
}