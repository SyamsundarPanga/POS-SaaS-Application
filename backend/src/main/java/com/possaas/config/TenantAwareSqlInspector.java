package com.possaas.config;

import org.hibernate.resource.jdbc.spi.StatementInspector;
import org.springframework.stereotype.Component;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Hibernate StatementInspector that automatically appends tenant_id filter
 * to all SQL queries, including native queries.
 * 
 * This ensures data isolation even when using nativeQuery = true in
 * repositories.
 */
@Component
public class TenantAwareSqlInspector implements StatementInspector {

    // Tables that should be filtered by tenant_id
    private static final String[] TENANT_FILTERED_TABLES = {
            "users", "products", "categories", "orders", "order_items",
            "customers", "inventory", "branches"
    };

    // Tables that should NOT be filtered (shared across tenants)
    private static final String[] EXCLUDED_TABLES = {
            "tenants", "subscription_plan", "flyway_schema_history"
    };

    @Override
    public String inspect(String sql) {
        String tenantId = TenantContext.getTenantIdOrNull();

        // Skip if no tenant context or if it's a DDL/system query
        if (tenantId == null || "SUPERADMIN".equalsIgnoreCase(tenantId) || sql == null) {
            return sql;
        }

        String sqlLower = sql.toLowerCase().trim();

        // Skip DDL statements
        if (sqlLower.startsWith("create ") ||
                sqlLower.startsWith("alter ") ||
                sqlLower.startsWith("drop ") ||
                sqlLower.startsWith("insert ") ||
                sqlLower.startsWith("update ") ||
                sqlLower.startsWith("delete ")) {
            return sql;
        }

        // Only process SELECT statements
        if (!sqlLower.startsWith("select ")) {
            return sql;
        }

        // Check if any excluded table is in the query
        for (String excluded : EXCLUDED_TABLES) {
            if (sqlLower.contains(excluded)) {
                return sql; // Don't filter queries on excluded tables
            }
        }

        // Check if query targets a tenant-filtered table
        boolean needsFilter = false;
        for (String table : TENANT_FILTERED_TABLES) {
            if (sqlLower.contains(" " + table) ||
                    sqlLower.contains(" " + table + " ") ||
                    sqlLower.contains("from " + table)) {
                needsFilter = true;
                break;
            }
        }

        if (!needsFilter) {
            return sql;
        }

        // Check if tenant_id filter already exists
        if (sqlLower.contains("tenant_id")) {
            return sql; // Already filtered
        }

        // Append tenant filter
        return appendTenantFilter(sql, tenantId);
    }

    private String appendTenantFilter(String sql, String tenantId) {
        String sqlLower = sql.toLowerCase();

        // Find the appropriate place to add the filter
        if (sqlLower.contains(" where ")) {
            // Add to existing WHERE clause
            int whereIndex = sqlLower.indexOf(" where ") + 7;
            String beforeWhere = sql.substring(0, whereIndex);
            String afterWhere = sql.substring(whereIndex);
            return beforeWhere + "tenant_id='" + tenantId + "' and " + afterWhere;
        } else if (sqlLower.contains(" order by ")) {
            // Insert before ORDER BY
            int orderIndex = sqlLower.indexOf(" order by ");
            String beforeOrder = sql.substring(0, orderIndex);
            String afterOrder = sql.substring(orderIndex);
            return beforeOrder + " where tenant_id='" + tenantId + "'" + afterOrder;
        } else if (sqlLower.contains(" group by ")) {
            // Insert before GROUP BY
            int groupIndex = sqlLower.indexOf(" group by ");
            String beforeGroup = sql.substring(0, groupIndex);
            String afterGroup = sql.substring(groupIndex);
            return beforeGroup + " where tenant_id='" + tenantId + "'" + afterGroup;
        } else if (sqlLower.contains(" limit ")) {
            // Insert before LIMIT
            int limitIndex = sqlLower.indexOf(" limit ");
            String beforeLimit = sql.substring(0, limitIndex);
            String afterLimit = sql.substring(limitIndex);
            return beforeLimit + " where tenant_id='" + tenantId + "'" + afterLimit;
        } else {
            // Append at the end
            return sql + " where tenant_id='" + tenantId + "'";
        }
    }
}
