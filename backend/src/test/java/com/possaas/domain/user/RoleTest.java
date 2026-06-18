package com.possaas.domain.user;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class RoleTest {

    @Test
    void shouldContainAllDefinedRoles() {
        Role[] roles = Role.values();

        assertEquals(5, roles.length);
        assertArrayEquals(
                new Role[] {
                        Role.ROLE_SUPER_ADMIN,
                        Role.ROLE_STORE_ADMIN,
                        Role.ROLE_BRANCH_MANAGER,
                        Role.ROLE_CASHIER,
                        Role.ROLE_VIEWER
                },
                roles);
    }

    @Test
    void shouldMatchEnumNamesExactly() {
        assertEquals("ROLE_SUPER_ADMIN", Role.ROLE_SUPER_ADMIN.name());
        assertEquals("ROLE_STORE_ADMIN", Role.ROLE_STORE_ADMIN.name());
        assertEquals("ROLE_BRANCH_MANAGER", Role.ROLE_BRANCH_MANAGER.name());
        assertEquals("ROLE_CASHIER", Role.ROLE_CASHIER.name());
        assertEquals("ROLE_VIEWER", Role.ROLE_VIEWER.name());
    }

    @Test
    void shouldConvertStringToEnum() {
        Role role = Role.valueOf("ROLE_CASHIER");
        assertEquals(Role.ROLE_CASHIER, role);
    }
}
