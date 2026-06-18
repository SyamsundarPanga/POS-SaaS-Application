package com.possaas.config;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * Testcontainers configuration for integration tests.
 * This provides a real PostgreSQL database in a Docker container for testing.
 * 
 * Works in both local development and CI environments:
 * - Local: Container reuse enabled for faster test execution
 * - CI: Fresh container per workflow run
 * 
 * @author POS SaaS Team
 */
@TestConfiguration(proxyBeanMethods = false)
public class TestContainersConfiguration {

    @Bean
    @ServiceConnection
    public PostgreSQLContainer<?> postgresContainer() {
        PostgreSQLContainer<?> container = new PostgreSQLContainer<>(DockerImageName.parse("postgres:15-alpine"))
                .withDatabaseName("pos_test")
                .withUsername("test")
                .withPassword("test");
        
        // Enable container reuse for local development (speeds up test execution)
        // In CI, this is controlled by testcontainers.properties
        if (System.getProperty("testcontainers.reuse.enable") == null) {
            container.withReuse(true);
        }
        
        return container;
    }
}
