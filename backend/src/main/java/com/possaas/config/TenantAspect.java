package com.possaas.config;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.hibernate.Session;
import org.springframework.stereotype.Component;

@Aspect
@Component
public class TenantAspect {

    @PersistenceContext
    private EntityManager entityManager;

    // Run before any service method
    // Targeting Service methods is enough as they manage transactions and initial
    // data access.
    @Before("execution(* com.possaas.service..*(..))")
    public void beforeExecution(JoinPoint pjp) throws Throwable {
        String tenantId = TenantContext.getTenantIdOrNull();

        if (tenantId != null && !"SUPERADMIN".equalsIgnoreCase(tenantId)) {
            org.hibernate.Filter filter = entityManager.unwrap(Session.class).enableFilter("tenantFilter");
            filter.setParameter("tenantId", tenantId);
        }
    }
}
