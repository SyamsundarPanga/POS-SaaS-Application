package com.possaas.config;

import org.springframework.boot.autoconfigure.orm.jpa.HibernatePropertiesCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Map;

@Configuration
public class HibernateConfig {

    private final TenantAwareSqlInspector tenantAwareSqlInspector;

    public HibernateConfig(TenantAwareSqlInspector tenantAwareSqlInspector) {
        this.tenantAwareSqlInspector = tenantAwareSqlInspector;
    }

    @Bean
    public HibernatePropertiesCustomizer hibernatePropertiesCustomizer() {
        return (Map<String, Object> hibernateProperties) -> {
            hibernateProperties.put("hibernate.session_factory.statement_inspector", tenantAwareSqlInspector);
        };
    }
}
