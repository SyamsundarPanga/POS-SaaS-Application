package com.possaas.domain.order;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = false)
public class OrderStatusConverter implements AttributeConverter<OrderStatus, String> {

    @Override
    public String convertToDatabaseColumn(OrderStatus attribute) {
        return attribute == null ? null : attribute.name();
    }

    @Override
    public OrderStatus convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return null;
        }
        if ("COMPLETE".equalsIgnoreCase(dbData)) {
            return OrderStatus.COMPLETED;
        }
        return OrderStatus.valueOf(dbData.toUpperCase());
    }
}
