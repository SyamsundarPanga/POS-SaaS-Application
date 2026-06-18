package com.possaas.integration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import com.possaas.security.service.UserDetailsImpl;
import com.possaas.service.auth.JwtTokenProvider;

class TenantSecurityInjectionTest extends BaseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Test
    @WithMockUser(roles = "STORE_ADMIN")
    @DisplayName("MULTI-007-QA-04: Verify parameterized queries prevent SQL injection in tenant_id")
    void shouldPreventSqlInjectionInTenantHeader() throws Exception {
        // Malicious tenant ID attempt to bypass WHERE clause
        String maliciousTenantId = "' OR '1'='1";
        String authToken = "Bearer " + tokenForTenant(maliciousTenantId);

        mockMvc.perform(get("/api/products")
                .header("Authorization", authToken)
                .header("X-Tenant-ID", maliciousTenantId)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
                
        /* Technical Detail: Hibernate generates: WHERE tenant_id = ?
           The value "' OR '1'='1" is treated as a single literal string, 
           preventing the logic from being executed.
        */
    }

    private String tokenForTenant(String tenantId) {
        UserDetailsImpl principal = new UserDetailsImpl(
                1L,
                "admin",
                "admin@test.com",
                "password",
                tenantId,
                java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_STORE_ADMIN")));

        org.springframework.security.authentication.UsernamePasswordAuthenticationToken auth =
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                        principal, null, principal.getAuthorities());

        return jwtTokenProvider.generateToken(auth, tenantId);
    }
}
