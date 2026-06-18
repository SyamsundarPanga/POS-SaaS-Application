package com.possaas.service.auth;

import java.security.Key;
import java.time.Instant;
import java.util.Date;

import javax.crypto.SecretKey;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;

@Component
public class JwtTokenProvider {

    private static final Logger logger =
            LoggerFactory.getLogger(JwtTokenProvider.class);

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.expiration-ms}")
    private long jwtExpirationMs;

    private Key key;

    @PostConstruct
    public void init() {
        if (jwtSecret == null || jwtSecret.isBlank()) {
            throw new IllegalStateException("JWT secret is missing!");
        }

        this.key = Keys.hmacShaKeyFor(
                Decoders.BASE64.decode(jwtSecret)
        );
    }

    // --------------------------------------------------
    // Token Generation
    // --------------------------------------------------
    public String generateToken(Authentication authentication, String tenantId) {
        
        Object principal = authentication.getPrincipal();
        String username;
        String email;
        
        // Handle both UserDetailsImpl and SuperAdminDetailsImpl
        if (principal instanceof com.possaas.security.service.UserDetailsImpl) {
            com.possaas.security.service.UserDetailsImpl userPrincipal = 
                    (com.possaas.security.service.UserDetailsImpl) principal;
            username = userPrincipal.getUsername();
            email = userPrincipal.getEmail();
        } else if (principal instanceof com.possaas.security.service.SuperAdminDetailsImpl) {
            com.possaas.security.service.SuperAdminDetailsImpl superAdminPrincipal = 
                    (com.possaas.security.service.SuperAdminDetailsImpl) principal;
            username = superAdminPrincipal.getUsername();
            email = superAdminPrincipal.getEmail();
        } else {
            throw new IllegalArgumentException("Unsupported principal type: " + principal.getClass().getName());
        }

        return Jwts.builder()
                .setSubject(username)
                .claim("email", email)
                .claim("tenantId", tenantId)
                .setIssuedAt(new Date())
                .setExpiration(
                        new Date(System.currentTimeMillis() + jwtExpirationMs)
                )
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    // --------------------------------------------------
    // Token Parsing
    // --------------------------------------------------
    public String getUsername(String token) {
        return getClaims(token).getSubject();
    }

    public String getTenantId(String token) {
        return getClaims(token).get("tenantId", String.class);
    }

    public Instant getExpiration(String token) {
        return getClaims(token).getExpiration().toInstant();
    }

    // --------------------------------------------------
    // Validation
    // --------------------------------------------------
    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder()
                    .setSigningKey(key)
                    .build()
                    .parseClaimsJws(token);
            logger.debug("JWT token validation successful");
            return true;
        } catch (MalformedJwtException e) {
            logger.error("Invalid JWT token - Malformed: {}", e.getMessage());
        } catch (ExpiredJwtException e) {
            logger.error("Invalid JWT token - Expired: {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            logger.error("Invalid JWT token - Unsupported: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            logger.error("Invalid JWT token - Illegal argument: {}", e.getMessage());
        } catch (JwtException e) {
            logger.error("Invalid JWT token - General error: {}", e.getMessage());
        }
        return false;
    }

    // --------------------------------------------------
    // Internal helper
    // --------------------------------------------------
    private Claims getClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
    
    public String getEmailFromToken(String jwt) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(key) 
                .build()
                .parseClaimsJws(jwt)
                .getBody(); 
                
        return String.valueOf(claims.get("email"));
    }
}
