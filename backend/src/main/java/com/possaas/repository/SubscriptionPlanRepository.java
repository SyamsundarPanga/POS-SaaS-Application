package com.possaas.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.possaas.domain.tenant.SubscriptionPlan;
import com.possaas.domain.tenant.SubscriptionPlanType;

@Repository
public interface SubscriptionPlanRepository 
        extends JpaRepository<SubscriptionPlan, String> {

    Optional<SubscriptionPlan> findByPlanType(SubscriptionPlanType planType);
}
