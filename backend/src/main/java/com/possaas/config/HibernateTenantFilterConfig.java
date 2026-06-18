package com.possaas.config;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.hibernate.Session;
import org.springframework.stereotype.Component;

@Component
public class HibernateTenantFilterConfig {

    @PersistenceContext
    private EntityManager entityManager;

    public void enableTenantFilter() {
        String tenantId = TenantContext.getTenantId();

        Session session = entityManager.unwrap(Session.class);
        session.enableFilter("tenantFilter")
               .setParameter("tenantId", tenantId);
    }

    public void disableTenantFilter() {
        Session session = entityManager.unwrap(Session.class);
        session.disableFilter("tenantFilter");
    }
}

