package com.possaas.controller;

import com.possaas.config.TenantContext;
import com.possaas.domain.tenant.Tenant;
import com.possaas.domain.user.Role;
import com.possaas.domain.user.User;
import com.possaas.repository.QueryVerificationRepository;
import com.possaas.repository.TenantRepository;
import com.possaas.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Controller for testing multi-tenant data isolation.
 * 
 * This controller provides endpoints to verify that Hibernate Filters
 * correctly isolate data between tenants for different query types.
 * 
 * ENDPOINTS:
 * - POST /api/test/setup - Create test data (2 tenants, 2 users)
 * - GET /api/test/jpql - Test JPQL query (should be filtered)
 * - GET /api/test/native - Test Native query (NOT filtered - shows leak)
 * - GET /api/test/native-secure - Test secure native query with manual filter
 * - GET /api/test/compare - Compare all query results side by side
 */
@RestController
@RequestMapping("/api/test")
public class QueryVerificationController {

    @Autowired
    private QueryVerificationRepository queryVerificationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TenantRepository tenantRepository;

    /**
     * Setup test data: Creates 2 tenants with 1 user each.
     */
    @PostMapping("/setup")
    public ResponseEntity<Map<String, Object>> setupTestData() {
        Map<String, Object> response = new HashMap<>();

        // Create Tenant A
        if (!tenantRepository.existsById("tenant-a")) {
            Tenant tenantA = new Tenant();
            tenantA.setId("tenant-a");
            tenantA.setName("Tenant A Corporation");
            tenantRepository.save(tenantA);
            response.put("tenantA", "Created");
        } else {
            response.put("tenantA", "Already exists");
        }

        // Create Tenant B
        if (!tenantRepository.existsById("tenant-b")) {
            Tenant tenantB = new Tenant();
            tenantB.setId("tenant-b");
            tenantB.setName("Tenant B Industries");
            tenantRepository.save(tenantB);
            response.put("tenantB", "Created");
        } else {
            response.put("tenantB", "Already exists");
        }

        // Create User A for Tenant A
        TenantContext.setTenantId("tenant-a");
        if (userRepository.findByEmail("admin@tenant-a.com").isEmpty()) {
            User userA = new User();
            userA.setEmail("admin@tenant-a.com");
            userA.setUsername("admin_tenant_a");
            userA.setPassword("securepassword123");
            userA.setRole(Role.ROLE_STORE_ADMIN);
            userRepository.save(userA);
            response.put("userA", "Created");
        } else {
            response.put("userA", "Already exists");
        }

        // Create User B for Tenant B
        TenantContext.setTenantId("tenant-b");
        if (userRepository.findByEmail("admin@tenant-b.com").isEmpty()) {
            User userB = new User();
            userB.setEmail("admin@tenant-b.com");
            userB.setUsername("admin_tenant_b");
            userB.setPassword("securepassword456");
            userB.setRole(Role.ROLE_STORE_ADMIN);
            userRepository.save(userB);
            response.put("userB", "Created");
        } else {
            response.put("userB", "Already exists");
        }

        TenantContext.clear();
        response.put("status", "Setup Complete");
        return ResponseEntity.ok(response);
    }

    /**
     * TASK 1: Test Hibernate Filter with JPQL Query
     * 
     * Expected: Returns ONLY users from the tenant specified in X-Tenant-ID header
     */
    @GetMapping("/jpql")
    public ResponseEntity<Map<String, Object>> testJpqlQuery(
            @RequestHeader(value = "X-Tenant-ID", required = false) String tenantId) {

        Map<String, Object> response = new HashMap<>();
        response.put("queryType", "JPQL");
        response.put("tenantHeader", tenantId);
        response.put("filterExpected", true);

        List<User> users = queryVerificationRepository.findAllUsersWithJpqlQuery();
        response.put("userCount", users.size());
        response.put("users", users.stream().map(u -> Map.of(
                "id", u.getId(),
                "email", u.getEmail(),
                "tenantId", u.getTenantId())).toList());

        boolean isSecure = users.stream().allMatch(u -> tenantId == null || tenantId.equals(u.getTenantId()));
        response.put("isolationStatus", isSecure ? "SECURE" : "LEAK DETECTED");

        return ResponseEntity.ok(response);
    }

    /**
     * TASK 2: Test Hibernate Filter with Native Query
     * 
     * Expected: Returns ALL users from ALL tenants (demonstrates security
     * vulnerability)
     */
    @GetMapping("/native")
    public ResponseEntity<Map<String, Object>> testNativeQuery(
            @RequestHeader(value = "X-Tenant-ID", required = false) String tenantId) {

        Map<String, Object> response = new HashMap<>();
        response.put("queryType", "Native SQL");
        response.put("tenantHeader", tenantId);
        response.put("filterExpected", false);
        response.put("WARNING", "Native queries bypass Hibernate filters!");

        List<User> users = queryVerificationRepository.findAllUsersWithNativeQuery();
        response.put("userCount", users.size());
        response.put("users", users.stream().map(u -> Map.of(
                "id", u.getId(),
                "email", u.getEmail(),
                "tenantId", u.getTenantId())).toList());

        boolean hasLeak = users.stream().anyMatch(u -> tenantId != null && !tenantId.equals(u.getTenantId()));
        response.put("isolationStatus", hasLeak ? "DATA LEAKAGE DETECTED" : "SECURE");

        return ResponseEntity.ok(response);
    }

    /**
     * Test secure native query with manual tenant filtering
     */
    @GetMapping("/native-secure")
    public ResponseEntity<Map<String, Object>> testSecureNativeQuery(
            @RequestHeader(value = "X-Tenant-ID", required = false) String tenantId) {

        Map<String, Object> response = new HashMap<>();
        response.put("queryType", "Native SQL with Manual Filter");
        response.put("tenantHeader", tenantId);

        if (tenantId == null) {
            response.put("error", "X-Tenant-ID header required");
            return ResponseEntity.badRequest().body(response);
        }

        List<User> users = queryVerificationRepository.findAllUsersWithSecureNativeQuery(tenantId);
        response.put("userCount", users.size());
        response.put("users", users.stream().map(u -> Map.of(
                "id", u.getId(),
                "email", u.getEmail(),
                "tenantId", u.getTenantId())).toList());
        response.put("isolationStatus", "SECURE (manual filter applied)");

        return ResponseEntity.ok(response);
    }

    /**
     * Compare all query types side by side
     */
    @GetMapping("/compare")
    public ResponseEntity<Map<String, Object>> compareAllQueries(
            @RequestHeader(value = "X-Tenant-ID", required = false) String tenantId) {

        Map<String, Object> response = new HashMap<>();
        response.put("tenantHeader", tenantId);

        // JPQL Results
        List<User> jpqlUsers = queryVerificationRepository.findAllUsersWithJpqlQuery();
        response.put("jpqlQuery", Map.of(
                "userCount", jpqlUsers.size(),
                "tenantIds", jpqlUsers.stream().map(User::getTenantId).distinct().toList(),
                "status",
                jpqlUsers.stream().allMatch(u -> tenantId == null || tenantId.equals(u.getTenantId())) ? "SECURE"
                        : "LEAK"));

        // Native Results
        List<User> nativeUsers = queryVerificationRepository.findAllUsersWithNativeQuery();
        response.put("nativeQuery", Map.of(
                "userCount", nativeUsers.size(),
                "tenantIds", nativeUsers.stream().map(User::getTenantId).distinct().toList(),
                "status",
                nativeUsers.stream().anyMatch(u -> tenantId != null && !tenantId.equals(u.getTenantId())) ? "DATA LEAK"
                        : "SECURE"));

        // Secure Native Results
        if (tenantId != null) {
            List<User> secureNativeUsers = queryVerificationRepository.findAllUsersWithSecureNativeQuery(tenantId);
            response.put("secureNativeQuery", Map.of(
                    "userCount", secureNativeUsers.size(),
                    "tenantIds", secureNativeUsers.stream().map(User::getTenantId).distinct().toList(),
                    "status", "SECURE"));
        }

        return ResponseEntity.ok(response);
    }
}
