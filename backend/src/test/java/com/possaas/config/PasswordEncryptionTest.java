package com.possaas.config;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.*;

class PasswordEncryptionTest {

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Test
    void shouldEncryptPasswordBeforeStoring() {
        String rawPassword = "SecurePass123";

        String encodedPassword = passwordEncoder.encode(rawPassword);

        assertNotNull(encodedPassword);
        assertNotEquals(rawPassword, encodedPassword,
                "Plain text password should not be stored");
    }

    @Test
    void shouldVerifyPasswordUsingMatches() {
        String rawPassword = "SecurePass123";
        String encodedPassword = passwordEncoder.encode(rawPassword);

        boolean matches = passwordEncoder.matches(rawPassword, encodedPassword);

        assertTrue(matches, "BCrypt should match raw and encoded password");
    }

    @Test
    void shouldFailForWrongPassword() {
        String rawPassword = "SecurePass123";
        String wrongPassword = "WrongPass123";
        String encodedPassword = passwordEncoder.encode(rawPassword);

        assertFalse(
                passwordEncoder.matches(wrongPassword, encodedPassword),
                "BCrypt should return false for incorrect password"
        );
    }

    @Test
    void shouldGenerateDifferentHashesForSamePassword() {
        String rawPassword = "SecurePass123";

        String hash1 = passwordEncoder.encode(rawPassword);
        String hash2 = passwordEncoder.encode(rawPassword);

        assertNotEquals(hash1, hash2,
                "BCrypt should generate different hashes due to salt");
    }
}
