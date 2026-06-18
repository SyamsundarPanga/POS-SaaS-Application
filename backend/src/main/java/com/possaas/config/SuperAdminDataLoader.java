package com.possaas.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.possaas.domain.superadmin.SuperAdmin;
import com.possaas.domain.superadmin.SuperAdminStatus;
import com.possaas.repository.SuperAdminRepository;

@Configuration
public class SuperAdminDataLoader {

    private static final Logger logger = LoggerFactory.getLogger(SuperAdminDataLoader.class);

    @Bean
    CommandLineRunner initSuperAdmin(SuperAdminRepository superAdminRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            if (superAdminRepository.count() == 0) {
                SuperAdmin superAdmin = new SuperAdmin();
                superAdmin.setUsername("superadmin");
                superAdmin.setEmail("superadmin@possaas.com");
                superAdmin.setPassword(passwordEncoder.encode("SuperAdmin@123"));
                superAdmin.setFirstName("Super");
                superAdmin.setLastName("Admin");
                superAdmin.setStatus(SuperAdminStatus.ACTIVE);

                superAdminRepository.save(superAdmin);
                
                logger.info("✅ Default SuperAdmin created successfully");
                logger.info("📧 Email: superadmin@possaas.com");
                logger.info("🔑 Password: SuperAdmin@123");
                logger.info("⚠️  Please change the password after first login!");
            } else {
                logger.info("SuperAdmin already exists, skipping initialization");
            }
        };
    }
}
