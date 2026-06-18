package com.possaas.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import com.possaas.security.TenantFilterInterceptor;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Autowired
    private TenantFilterInterceptor tenantFilterInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(tenantFilterInterceptor)
                .addPathPatterns("/api/**") // Apply to all API endpoints
                .excludePathPatterns(
                        "/api/auth/**",           // Exclude authentication endpoints
                        "/api/public/**",         // Exclude public endpoints
                        "/v3/api-docs/**",        // Exclude Swagger API docs
                        "/swagger-ui/**",         // Exclude Swagger UI
                        "/swagger-ui.html",       // Exclude Swagger UI HTML
                        "/swagger-resources/**",  // Exclude Swagger resources
                        "/webjars/**",            // Exclude webjars
                        "/actuator/**"            // Exclude actuator endpoints (if using Spring Boot Actuator)
                );
    }
}
