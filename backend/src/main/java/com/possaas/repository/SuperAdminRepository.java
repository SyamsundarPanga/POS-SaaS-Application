package com.possaas.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.possaas.domain.superadmin.SuperAdmin;

@Repository
public interface SuperAdminRepository extends JpaRepository<SuperAdmin, Long> {

    Optional<SuperAdmin> findByEmail(String email);

    Optional<SuperAdmin> findByUsername(String username);

    boolean existsByEmail(String email);

    boolean existsByUsername(String username);
}
