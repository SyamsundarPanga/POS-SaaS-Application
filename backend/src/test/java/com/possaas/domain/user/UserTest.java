package com.possaas.domain.user;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.possaas.config.TenantContext;
import com.possaas.domain.branch.Branch;
import com.possaas.repository.BranchRepository;

class UserTest {

	@Autowired
	private BranchRepository branchRepository;
	
    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    @DisplayName("Should assign tenantId from TenantContext when not already set")
    void shouldAssignTenantSuccessfully() {
        // Arrange
        TenantContext.setTenantId("tenant-123");
        User user = new User();

        // Act
        user.assignTenant();

        // Assert
        assertEquals("tenant-123", user.getTenantId());
    }

    @Test
    @DisplayName("Should throw IllegalStateException when TenantContext is missing")
    void shouldThrowExceptionWhenTenantContextMissing() {
        // Arrange
        User user = new User();

        // Act & Assert
        assertThrows(IllegalStateException.class, user::assignTenant);
    }

    @Test
    @DisplayName("Should not override tenantId if already set")
    void shouldNotOverrideTenantIfAlreadySet() {
        // Arrange
        TenantContext.setTenantId("context-tenant");
        User user = new User();
        user.setTenantId("manual-tenant");

        // Act
        user.assignTenant();

        // Assert
        assertEquals("manual-tenant", user.getTenantId());
    }

    @Test
    @DisplayName("User status should be ACTIVE by default")
    void shouldBeActiveByDefault() {
        // Arrange
        User user = new User();

        // Assert
        assertEquals(UserStatus.ACTIVE, user.getStatus());
    }

    @Test
    @DisplayName("Should correctly set and get user fields")
    void shouldSetAndGetUserFields() {
        // Arrange
        User user = new User();
        
        Branch branch = new Branch();
        branch.setId(101L);
        // Act
        user.setUsername("john");
        user.setEmail("john@test.com");
        user.setPassword("password");
        user.setFirstName("John");
        user.setLastName("Doe");
        user.setRole(Role.ROLE_STORE_ADMIN);
        user.setStatus(UserStatus.INACTIVE);
        user.setBranch(branch);

        // Assert
        assertEquals("john", user.getUsername());
        assertEquals("john@test.com", user.getEmail());
        assertEquals("password", user.getPassword());
        assertEquals("John", user.getFirstName());
        assertEquals("Doe", user.getLastName());
        assertEquals(Role.ROLE_STORE_ADMIN, user.getRole());
        assertEquals(UserStatus.INACTIVE, user.getStatus());
        assertEquals(101L, user.getBranch().getId());
    }

    @Test
    @DisplayName("Should support all defined user roles")
    void shouldSupportAllRoles() {
        for (Role role : Role.values()) {
            User user = new User();
            user.setRole(role);

            assertEquals(role, user.getRole());
        }
    }

    @Test
    @DisplayName("Equals and hashCode should work for same user data")
    void equalsAndHashCodeShouldWork() {
        // Arrange
        User user1 = new User();
        user1.setUsername("john");
        user1.setEmail("john@test.com");
        user1.setPassword("password");
        user1.setRole(Role.ROLE_VIEWER);

        User user2 = new User();
        user2.setUsername("john");
        user2.setEmail("john@test.com");
        user2.setPassword("password");
        user2.setRole(Role.ROLE_VIEWER);

        // Assert
        assertEquals(user1, user2);
        assertEquals(user1.hashCode(), user2.hashCode());
    }
}
