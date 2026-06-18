package com.possaas.config;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.*;

class PasswordVerificationTest {

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Test
    void shouldReturnTrueWhenPasswordMatches() {
        // Given
        String rawPassword = "SecurePass123";
        String encodedPassword = passwordEncoder.encode(rawPassword);

        // When
        boolean result = passwordEncoder.matches(rawPassword, encodedPassword);

        // Then
        assertTrue(result,
                "BCrypt should return true for correct password");
    }

    @Test
    void shouldReturnFalseWhenPasswordDoesNotMatch() {
        // Given
        String rawPassword = "SecurePass123";
        String wrongPassword = "WrongPass123";
        String encodedPassword = passwordEncoder.encode(rawPassword);

        // When
        boolean result = passwordEncoder.matches(wrongPassword, encodedPassword);

        // Then
        assertFalse(result,
                "BCrypt should return false for incorrect password");
    }
}
