package com.possaas.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import com.possaas.service.auth.JwtTokenProvider;
import com.possaas.security.service.UserDetailsImpl;

import java.lang.reflect.Field;
import java.util.Base64;
import java.util.Collections;
import java.util.Date;

import static org.junit.jupiter.api.Assertions.*;

class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;
    private Authentication authentication;

    // Base64-encoded test secret
    private static final String TEST_SECRET =
            Base64.getEncoder().encodeToString(
                    "test-secret-key-for-jwt-provider-123456".getBytes()
            );

    @BeforeEach
    void setUp() throws Exception {
        jwtTokenProvider = new JwtTokenProvider();

        // Inject secret
        Field secretField =
                JwtTokenProvider.class.getDeclaredField("jwtSecret");
        secretField.setAccessible(true);
        secretField.set(jwtTokenProvider, TEST_SECRET);

        // Inject expiration (24 hours)
        Field expField =
                JwtTokenProvider.class.getDeclaredField("jwtExpirationMs");
        expField.setAccessible(true);
        expField.set(jwtTokenProvider, 86400000L);

        // Initialize key
        jwtTokenProvider.init();

        UserDetailsImpl user = new UserDetailsImpl(
                1L,
                "testuser",
                "testuser@test.com",
                "password",
                "tenant-123",
                Collections.emptyList());

        authentication =
                new UsernamePasswordAuthenticationToken(
                        user, null, user.getAuthorities()
                );
    }

    // ==================================================
    
    @Test
    @DisplayName("Token generation should include all required claims")
    void shouldGenerateTokenWithAllClaims() {
        String token =
                jwtTokenProvider.generateToken(authentication, "tenant-123");

        Claims claims = Jwts.parserBuilder()
                .setSigningKey(
                        Base64.getDecoder().decode(TEST_SECRET)
                )
                .build()
                .parseClaimsJws(token)
                .getBody();

        assertEquals("testuser", claims.getSubject());
        assertEquals("tenant-123", claims.get("tenantId"));
        assertNotNull(claims.getIssuedAt());
        assertNotNull(claims.getExpiration());
    }

    // ==================================================
   
    @Test
    @DisplayName("Token expiration should be set to 24 hours")
    void shouldSetExpirationTo24Hours() {
        String token =
                jwtTokenProvider.generateToken(authentication, "tenant-123");

        Claims claims = Jwts.parserBuilder()
                .setSigningKey(
                        Base64.getDecoder().decode(TEST_SECRET)
                )
                .build()
                .parseClaimsJws(token)
                .getBody();

        Date issuedAt = claims.getIssuedAt();
        Date expiration = claims.getExpiration();

        long diffHours =
                (expiration.getTime() - issuedAt.getTime())
                        / (1000 * 60 * 60);

        assertEquals(24, diffHours);
    }

    // ==================================================
    
    @Test
    @DisplayName("Token signature should be verifiable with secret key")
    void shouldValidateTokenSignature() {
        String token =
                jwtTokenProvider.generateToken(authentication, "tenant-123");

        boolean valid =
                jwtTokenProvider.validateToken(token);

        assertTrue(valid);
    }

    // ==================================================
    
    @Test
    @DisplayName("Missing JWT secret should throw exception")
    void shouldThrowExceptionWhenSecretIsMissing() {
        JwtTokenProvider brokenProvider =
                new JwtTokenProvider();

        IllegalStateException exception =
                assertThrows(
                        IllegalStateException.class,
                        brokenProvider::init
                );

        assertEquals(
                "JWT secret is missing!",
                exception.getMessage()
        );
    }
}
