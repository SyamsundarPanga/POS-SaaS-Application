package com.possaas.domain.user;

import com.possaas.service.auth.JwtTokenProvider;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.util.ReflectionTestUtils;

import com.possaas.security.service.UserDetailsImpl;

import java.util.Base64;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class JwtTokenProviderTest {

        private JwtTokenProvider jwtTokenProvider;
        private final String jwtSecret = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";
        private final long jwtExpirationMs = 3600000;

        @BeforeEach
        void setUp() {
                jwtTokenProvider = new JwtTokenProvider();
                ReflectionTestUtils.setField(jwtTokenProvider, "jwtSecret", jwtSecret);
                ReflectionTestUtils.setField(jwtTokenProvider, "jwtExpirationMs", jwtExpirationMs);
                jwtTokenProvider.init();
        }

        @Test
        void shouldGenerateJwtWithoutRoleClaim() {
                UserDetailsImpl userDetails = new UserDetailsImpl(
                                1L,
                                "admin@test.com",
                                "admin@test.com",
                                "password",
                                "tenant-1",
                                List.of(new SimpleGrantedAuthority("ROLE_STORE_ADMIN")));

                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                                userDetails,
                                null,
                                userDetails.getAuthorities());

                String token = jwtTokenProvider.generateToken(authentication, "tenant-1");

                // Basic validation
                assertTrue(jwtTokenProvider.validateToken(token));
                assertEquals("admin@test.com", jwtTokenProvider.getUsername(token));
                assertEquals("tenant-1", jwtTokenProvider.getTenantId(token));

                // Parse claims directly
                Claims claims = Jwts.parserBuilder()
                                .setSigningKey(
                                                Keys.hmacShaKeyFor(
                                                                Base64.getDecoder().decode(jwtSecret)))
                                .build()
                                .parseClaimsJws(token)
                                .getBody();

                // Role is NOT part of JWT by design
                assertFalse(
                                claims.containsKey("role"),
                                "JWT should not contain role claim");
        }
}
