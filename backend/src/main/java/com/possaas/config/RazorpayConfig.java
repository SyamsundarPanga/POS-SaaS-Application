package com.possaas.config;

import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
@Slf4j
public class RazorpayConfig {

    @Value("${app.razorpay.key.id}")
    private String keyId;

    @Value("${app.razorpay.key.secret}")
    private String keySecret;

    @Bean
    @Primary
    public RazorpayClient razorpayClient() {
        try {
            RazorpayClient client = new RazorpayClient(keyId, keySecret);
            String mode = keyId.startsWith("rzp_test") ? "SANDBOX" : "PRODUCTION";
            log.info("Razorpay client initialized successfully in {} mode", mode);
            return client;
        } catch (RazorpayException e) {
            log.error("Failed to initialize Razorpay client: {}", e.getMessage());
            throw new RuntimeException("Razorpay initialization failed", e);
        }
    }
}