package com.possaas.config;

import java.util.List;
import java.util.Optional;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.possaas.domain.inventory.Inventory;
import com.possaas.domain.product.Product;
import com.possaas.domain.tenant.Tenant;
import com.possaas.repository.InventoryRepository;
import com.possaas.repository.ProductRepository;
import com.possaas.repository.TenantRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataLoader implements ApplicationRunner {

    private final TenantRepository tenantRepository;
    private final ProductRepository productRepository;
    private final InventoryRepository inventoryRepository;
    private final SeedConfig seedConfig;

    @Override
    public void run(ApplicationArguments args) {

        if (!seedConfig.isEnabled()) {
            log.info("Inventory seeding is DISABLED via config.");
            return;
        }

        log.info("========== INVENTORY SEEDING STARTED ==========");

        List<Tenant> tenants = tenantRepository.findAll();
        log.info("Total tenants found: {}", tenants.size());

        int totalCreated = 0;
        int totalSkipped = 0;

        for (Tenant tenant : tenants) {
            Result result = loadInventoryForTenant(tenant);
            totalCreated += result.created;
            totalSkipped += result.skipped;
        }

        log.info("========== INVENTORY SEEDING COMPLETED ==========");
        log.info("Total inventory created: {}", totalCreated);
        log.info("Total inventory skipped: {}", totalSkipped);
    }

    @Transactional
    protected Result loadInventoryForTenant(Tenant tenant) {

        String tenantId = tenant.getId();

        log.info("Seeding inventory for tenant: {}", tenantId);

        int created = 0;
        int skipped = 0;

        try {
            // Set tenant context for this operation
            // TenantContext.setTenantId(tenantId); // Commented out - using entity-level tenant assignment

            List<Product> products = productRepository.findAll();
            log.info("Tenant {} → {} products found", tenantId, products.size());

            for (Product product : products) {

                Optional<Inventory> existingInventory =
                        inventoryRepository.findByProductIdAndTenantId(
                                product.getId(),
                                tenantId
                        );

                if (existingInventory.isPresent()) {
                    skipped++;
                    continue;
                }

                Inventory inventory = new Inventory();
                inventory.setProduct(product);
                inventory.setQuantity(100);
                inventory.setLowStockThreshold(product.getMinStockLevel() != null ? product.getMinStockLevel() : 10);
                inventory.setReservedQuantity(0);
                inventory.setTenantId(tenantId);

                inventoryRepository.save(inventory);
                created++;
            }

            log.info("Tenant {} → Created: {}, Skipped: {}", tenantId, created, skipped);

        } catch (Exception e) {
            log.error("Error seeding inventory for tenant {}", tenantId, e);
        }

        return new Result(created, skipped);
    }

    private record Result(int created, int skipped) {}
}
