package com.possaas.integration;

import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.Import;

import com.possaas.config.TestSecurityConfig;

@Import(TestSecurityConfig.class)
public class TenantIsolationIntegrationTest extends BaseIntegrationTest {
    @Test
    void contextLoads() {
    }
}
