package com.possaas.integration;

import com.possaas.config.TestContainersConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

/**
 * Base class for all integration tests using Testcontainers.
 * 
 * This provides:
 * - Full Spring Boot application context
 * - Real PostgreSQL database in Docker container via @ServiceConnection
 * - MockMvc for API testing
 * - Transactional rollback after each test
 * - Container reuse for performance
 * 
 * @author POS SaaS Team
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestContainersConfiguration.class)
@Transactional
public abstract class BaseIntegrationTest {
    // Common test utilities can be added here
}
