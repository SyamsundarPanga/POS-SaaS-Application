package com.possaas.dto.response;

import java.util.List;

public record ImportResultResponse(
        int totalRows,
        int importedRows,
        int failedRows,
        List<String> errors) {
}
