package com.possaas.integration;

import com.possaas.config.TenantContext;
import com.possaas.service.auth.JwtTokenProvider;
import com.possaas.service.impl.UserDetailsServiceImpl;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class InvalidTokenIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private UserDetailsServiceImpl userDetailsService;

    @BeforeEach
    @AfterEach
    void clear() {
        TenantContext.clear();
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Should return 401 and null context when token signature is tampered")
    void shouldRejectTamperedToken() throws Exception {
        // 1. Arrange: Provider identifies the signature as invalid
        when(jwtTokenProvider.validateToken(anyString())).thenReturn(false);

        // 2. Act: Call the validate endpoint with the bad token
        mockMvc.perform(get("/api/auth/validate")
                .header("Authorization", "Bearer eyJhbGciOiJIUzI1NiJ9.invalid.signature")
                .contentType(MediaType.APPLICATION_JSON))
                // 3. Assert: Matches your actual response body and status
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.valid").value(false))
                .andExpect(jsonPath("$.message").value("Invalid token"));

        // 4. Verify: Critical guardrail check
        assertNull(TenantContext.getTenantIdOrNull(),
                "CRITICAL: TenantContext must remain null for tampered tokens!");
    }
}