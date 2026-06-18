package com.possaas.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.possaas.dto.request.LoginRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.possaas.integration.BaseIntegrationTest;

class AuthControllerIntegrationTest extends BaseIntegrationTest {

        @Autowired
        private MockMvc mockMvc;

        @Autowired
        private ObjectMapper objectMapper;

        /**
         * AUTH-003-QA-04
         * Login should fail when tenant_id is wrong
         */
        @Test
        void login_shouldFail_whenTenantIdIsWrong() throws Exception {

                // GIVEN: valid credentials (but tenant will be wrong)
                LoginRequest request = new LoginRequest();
                request.setEmail("admin@acme.com");
                request.setPassword("Password@123");

                // WHEN + THEN
                mockMvc.perform(post("/api/auth/login")
                                .contentType(MediaType.APPLICATION_JSON)
                                .header("X-Tenant-Id", "invalid-tenant-id") // ❌ wrong tenant
                                .content(objectMapper.writeValueAsString(request)))
                                .andExpect(status().isUnauthorized())
                                .andExpect(jsonPath("$.error")
                                                .value("Authentication Failed"))
                                .andExpect(jsonPath("$.message")
                                                .value("Invalid credentials"));
        }
}