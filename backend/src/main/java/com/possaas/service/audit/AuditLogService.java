package com.possaas.service.audit;

import com.possaas.config.TenantContext;
import com.possaas.domain.audit.AuditLog;
import com.possaas.domain.user.User;
import com.possaas.repository.AuditLogRepository;
import com.possaas.repository.BranchRepository;
import com.possaas.repository.UserRepository;
import com.possaas.security.service.UserDetailsImpl;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final BranchRepository branchRepository;
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Transactional
    public void log(String action, String resource, String resourceId, String details) {
        log(action, resource, resourceId, details, TenantContext.getTenantId());
    }

    @Transactional
    public void log(String action, String resource, String resourceId, String details, String tenantId) {
        AuditLog auditLog = new AuditLog();
        auditLog.setTenantId(tenantId);
        auditLog.setAction(action);
        auditLog.setResource(resource);
        auditLog.setResourceId(resourceId);
        auditLog.setDetails(details);
        
        // Extract IP Address
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes != null) {
            HttpServletRequest request = attributes.getRequest();
            String ip = request.getHeader("X-Forwarded-For");
            if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
                ip = request.getRemoteAddr();
            }
            auditLog.setIpAddress(ip);
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()) {
            auditLog.setUsername(authentication.getName());
            if (authentication.getPrincipal() instanceof UserDetailsImpl) {
                auditLog.setUserId(((UserDetailsImpl) authentication.getPrincipal()).getId());
            }
        } else {
            auditLog.setUsername("SYSTEM");
        }

        applyBranchContext(auditLog, tenantId, details);

        auditLogRepository.save(auditLog);
    }

    public Page<AuditLog> getLogsForTenant(java.time.LocalDateTime start, java.time.LocalDateTime end, Pageable pageable) {
        String tenantId = TenantContext.getTenantId();
        if (start != null && end != null) {
            return auditLogRepository.findByTenantIdAndCreatedAtBetween(tenantId, start, end, pageable);
        }
        return auditLogRepository.findByTenantId(tenantId, pageable);
    }

    public byte[] exportLogsCsv(LocalDateTime start, LocalDateTime end, String search) {
        List<AuditLog> logs = getExportLogs(start, end, search);
        List<String[]> rows = new ArrayList<>();
        rows.add(new String[] { "Timestamp", "User", "User ID", "Action", "Type", "Ref", "Branch", "Activity", "IP Address" });

        for (AuditLog log : logs) {
            rows.add(new String[] {
                    formatTimestamp(log.getCreatedAt()),
                    safe(log.getUsername()),
                    log.getUserId() != null ? String.valueOf(log.getUserId()) : "System",
                    safe(log.getAction()),
                    safe(log.getResource()),
                    safe(log.getResourceId()),
                    safe(log.getBranchName()),
                    safe(log.getDetails()),
                    safe(log.getIpAddress())
            });
        }

        return toCsvBytes(rows);
    }

    public byte[] exportLogsPdf(LocalDateTime start, LocalDateTime end, String search) {
        List<AuditLog> logs = getExportLogs(start, end, search);

        try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            final float pageWidth = PDRectangle.A4.getWidth();
            final float top = 800;
            final float bottom = 40;
            final float left = 30;
            final float tableWidth = pageWidth - (left * 2);
            final float lineHeight = 10;
            final float cellPadding = 3;
            final float[] colWidths = { 20f, 84f, 64f, 74f, 78f, 82f, tableWidth - (20f + 84f + 64f + 74f + 78f + 82f) };
            final String[] headers = { "#", "Timestamp", "User", "Action", "Type / Ref", "Branch", "Activity & IP" };

            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            PDPageContentStream content = new PDPageContentStream(document, page);
            float y = top;
            int index = 1;

            y = drawPdfHeader(content, y, start, end, search, logs.size());
            y = drawTableHeader(content, left, y, headers, colWidths);

            for (AuditLog log : logs) {
                List<String> c1 = wrapTextByWidth(String.valueOf(index), PDType1Font.HELVETICA, 8, colWidths[0] - (2 * cellPadding));
                List<String> c2 = wrapTextByWidth(formatTimestamp(log.getCreatedAt()), PDType1Font.HELVETICA, 8, colWidths[1] - (2 * cellPadding));
                List<String> c3 = wrapTextByWidth(safe(log.getUsername()), PDType1Font.HELVETICA, 8, colWidths[2] - (2 * cellPadding));
                List<String> c4 = wrapTextByWidth(safe(log.getAction()).replace('_', ' '), PDType1Font.HELVETICA, 8, colWidths[3] - (2 * cellPadding));
                String typeAndRef = safe(log.getResource()) + " / " + safe(log.getResourceId());
                List<String> c5 = wrapTextByWidth(typeAndRef, PDType1Font.HELVETICA, 8, colWidths[4] - (2 * cellPadding));
                String activityAndIp = safe(log.getDetails()) + " | IP: " + safe(log.getIpAddress());
                List<String> c6 = wrapTextByWidth(safe(log.getBranchName()), PDType1Font.HELVETICA, 8, colWidths[5] - (2 * cellPadding));
                List<String> c7 = wrapTextByWidth(activityAndIp, PDType1Font.HELVETICA, 8, colWidths[6] - (2 * cellPadding));

                int lines = maxLines(c1, c2, c3, c4, c5, c6, c7);
                float rowHeight = (lines * lineHeight) + 8;

                if (y - rowHeight < bottom) {
                    content.close();
                    page = new PDPage(PDRectangle.A4);
                    document.addPage(page);
                    content = new PDPageContentStream(document, page);
                    y = top;
                    y = drawPdfHeader(content, y, start, end, search, logs.size());
                    y = drawTableHeader(content, left, y, headers, colWidths);
                }

                if (index % 2 == 0) {
                    content.setNonStrokingColor(new Color(248, 250, 252));
                    content.addRect(left, y - rowHeight, tableWidth, rowHeight);
                    content.fill();
                }

                drawRowBorder(content, left, y, rowHeight, colWidths);
                drawCellText(content, left, y, colWidths[0], rowHeight, c1, lineHeight);
                drawCellText(content, left + colWidths[0], y, colWidths[1], rowHeight, c2, lineHeight);
                drawCellText(content, left + colWidths[0] + colWidths[1], y, colWidths[2], rowHeight, c3, lineHeight);
                drawCellText(content, left + colWidths[0] + colWidths[1] + colWidths[2], y, colWidths[3], rowHeight, c4, lineHeight);
                drawCellText(content, left + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], y, colWidths[4], rowHeight, c5, lineHeight);
                drawCellText(content, left + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], y, colWidths[5], rowHeight, c6, lineHeight);
                drawCellText(content, left + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5], y, colWidths[6], rowHeight, c7, lineHeight);

                y -= rowHeight;
                index++;
            }

            content.close();
            document.save(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Failed to export audit logs PDF", e);
        }
    }

    private List<AuditLog> getExportLogs(LocalDateTime start, LocalDateTime end, String search) {
        String tenantId = TenantContext.getTenantId();

        List<AuditLog> baseLogs;
        if (start != null && end != null) {
            baseLogs = auditLogRepository.findByTenantIdAndCreatedAtBetweenOrderByCreatedAtDesc(tenantId, start, end);
        } else {
            baseLogs = auditLogRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
        }

        String normalizedSearch = search == null ? "" : search.trim().toLowerCase();

        return baseLogs.stream()
                .filter(log -> !isAuthResource(log.getResource()))
                .filter(log -> matchesSearch(log, normalizedSearch))
                .collect(Collectors.toList());
    }

    private byte[] toCsvBytes(List<String[]> rows) {
        StringBuilder sb = new StringBuilder();
        for (String[] row : rows) {
            String line = java.util.Arrays.stream(row)
                    .map(this::escapeCsv)
                    .collect(Collectors.joining(","));
            sb.append(line).append("\n");
        }
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    private String escapeCsv(String value) {
        if (value == null) {
            return "";
        }
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    private float writeLine(PDPageContentStream content, float y, PDType1Font font, int size, String text) throws IOException {
        content.beginText();
        content.setFont(font, size);
        content.newLineAtOffset(36, y);
        content.showText(sanitizePdfText(text));
        content.endText();
        return y - (size + 4);
    }

    private List<String> wrapText(String text, int maxChars) {
        List<String> lines = new ArrayList<>();
        if (text == null || text.isBlank()) {
            lines.add("");
            return lines;
        }

        String[] words = text.split("\\s+");
        StringBuilder current = new StringBuilder();
        for (String word : words) {
            if (current.length() == 0) {
                current.append(word);
                continue;
            }
            if (current.length() + 1 + word.length() > maxChars) {
                lines.add(current.toString());
                current = new StringBuilder(word);
            } else {
                current.append(" ").append(word);
            }
        }
        if (current.length() > 0) {
            lines.add(current.toString());
        }
        return lines;
    }

    private String truncate(String text, int maxLength) {
        if (text == null) {
            return "";
        }
        return text.length() > maxLength ? text.substring(0, maxLength - 3) + "..." : text;
    }

    private float drawPdfHeader(PDPageContentStream content, float y, LocalDateTime start, LocalDateTime end, String search, int totalRecords) throws IOException {
        y = writeText(content, 30, y, PDType1Font.HELVETICA_BOLD, 16, "Business Audit Logs");
        y = writeText(content, 30, y - 2, PDType1Font.HELVETICA, 9,
                "Range: " + (start != null ? start.toLocalDate() : "All") + " to " + (end != null ? end.toLocalDate() : "All"));
        y = writeText(content, 30, y, PDType1Font.HELVETICA, 9,
                "Search: " + ((search == null || search.isBlank()) ? "All records" : search));
        y = writeText(content, 30, y, PDType1Font.HELVETICA, 9,
                "Generated: " + LocalDateTime.now().format(DATE_TIME_FORMATTER) + " | Total Records: " + totalRecords);
        return y - 10;
    }

    private float drawTableHeader(PDPageContentStream content, float left, float y, String[] headers, float[] colWidths) throws IOException {
        final float headerHeight = 18;

        content.setNonStrokingColor(new Color(15, 23, 42));
        content.addRect(left, y - headerHeight, sum(colWidths), headerHeight);
        content.fill();

        float x = left;
        for (int i = 0; i < headers.length; i++) {
            writeText(content, x + 3, y - 12, PDType1Font.HELVETICA_BOLD, 8, headers[i], Color.WHITE);
            x += colWidths[i];
        }

        drawRowBorder(content, left, y, headerHeight, colWidths);
        return y - headerHeight;
    }

    private void drawRowBorder(PDPageContentStream content, float left, float y, float rowHeight, float[] colWidths) throws IOException {
        content.setStrokingColor(new Color(203, 213, 225));
        content.addRect(left, y - rowHeight, sum(colWidths), rowHeight);
        content.stroke();

        float x = left;
        for (float width : colWidths) {
            content.moveTo(x, y);
            content.lineTo(x, y - rowHeight);
            content.stroke();
            x += width;
        }

        content.moveTo(x, y);
        content.lineTo(x, y - rowHeight);
        content.stroke();
    }

    private void drawCellText(PDPageContentStream content, float x, float y, float width, float rowHeight, List<String> lines, float lineHeight) throws IOException {
        float textY = y - 11;
        for (String line : lines) {
            if (textY < y - rowHeight + 3) {
                break;
            }
            writeText(content, x + 3, textY, PDType1Font.HELVETICA, 8, line);
            textY -= lineHeight;
        }
    }

    private float writeText(PDPageContentStream content, float x, float y, PDType1Font font, int size, String text) throws IOException {
        return writeText(content, x, y, font, size, text, Color.BLACK);
    }

    private float writeText(PDPageContentStream content, float x, float y, PDType1Font font, int size, String text, Color color) throws IOException {
        content.beginText();
        content.setFont(font, size);
        content.setNonStrokingColor(color);
        content.newLineAtOffset(x, y);
        content.showText(sanitizePdfText(text));
        content.endText();
        return y - (size + 2);
    }

    private List<String> wrapTextByWidth(String text, PDType1Font font, int fontSize, float maxWidth) throws IOException {
        List<String> lines = new ArrayList<>();
        if (text == null || text.isBlank()) {
            lines.add("");
            return lines;
        }

        String safeText = sanitizePdfText(text);
        String[] words = safeText.split("\\s+");
        StringBuilder current = new StringBuilder();

        for (String word : words) {
            String candidate = current.length() == 0 ? word : current + " " + word;
            float width = font.getStringWidth(candidate) / 1000f * fontSize;
            if (width <= maxWidth) {
                current.setLength(0);
                current.append(candidate);
            } else {
                if (current.length() > 0) {
                    lines.add(current.toString());
                    current.setLength(0);
                    current.append(word);
                } else {
                    lines.add(truncateByWidth(word, font, fontSize, maxWidth));
                }
            }
        }

        if (current.length() > 0) {
            lines.add(current.toString());
        }

        return lines;
    }

    private String truncateByWidth(String text, PDType1Font font, int fontSize, float maxWidth) throws IOException {
        String value = text;
        while (value.length() > 3 && (font.getStringWidth(value + "...") / 1000f * fontSize) > maxWidth) {
            value = value.substring(0, value.length() - 1);
        }
        return value.length() < text.length() ? value + "..." : value;
    }

    private int maxLines(List<String>... groups) {
        int max = 1;
        for (List<String> group : groups) {
            if (group != null && group.size() > max) {
                max = group.size();
            }
        }
        return max;
    }

    private float sum(float[] values) {
        float total = 0f;
        for (float value : values) {
            total += value;
        }
        return total;
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "N/A" : value;
    }

    private String formatTimestamp(LocalDateTime value) {
        return value == null ? "N/A" : value.format(DATE_TIME_FORMATTER);
    }

    private String sanitizePdfText(String text) {
        if (text == null) {
            return "";
        }
        return text.replaceAll("[^\\x20-\\x7E]", "?");
    }

    private boolean isAuthResource(String resource) {
        return resource != null && "AUTH".equalsIgnoreCase(resource);
    }

    private boolean matchesSearch(AuditLog log, String search) {
        if (search.isEmpty()) {
            return true;
        }

        return containsIgnoreCase(log.getUsername(), search)
                || containsIgnoreCase(log.getAction(), search)
                || containsIgnoreCase(log.getResource(), search)
                || containsIgnoreCase(log.getDetails(), search);
    }

    private boolean containsIgnoreCase(String value, String search) {
        return value != null && value.toLowerCase().contains(search);
    }

    private void applyBranchContext(AuditLog auditLog, String tenantId, String details) {
        if (auditLog.getUserId() != null) {
            userRepository.findByIdAndTenantId(auditLog.getUserId(), tenantId).ifPresent(user -> applyUserBranch(auditLog, user));
        }

        if (auditLog.getBranchId() == null) {
            Long branchIdFromDetails = extractBranchId(details);
            if (branchIdFromDetails != null) {
                auditLog.setBranchId(branchIdFromDetails);
                branchRepository.findById(branchIdFromDetails)
                        .ifPresent(branch -> auditLog.setBranchName(branch.getName()));
            }
        }

        if ((auditLog.getBranchName() == null || auditLog.getBranchName().isBlank()) && details != null) {
            String branchNameFromDetails = extractBranchName(details);
            if (branchNameFromDetails != null && !branchNameFromDetails.isBlank()) {
                auditLog.setBranchName(branchNameFromDetails);
            }
        }
    }

    private void applyUserBranch(AuditLog auditLog, User user) {
        if (user.getBranch() == null) {
            return;
        }

        auditLog.setBranchId(user.getBranch().getId());
        auditLog.setBranchName(user.getBranch().getName());
    }

    private Long extractBranchId(String details) {
        if (details == null || details.isBlank()) {
            return null;
        }

        java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("branch(?:\\s+ID)?[:\\s]+(\\d+)", java.util.regex.Pattern.CASE_INSENSITIVE)
                .matcher(details);
        if (!matcher.find()) {
            return null;
        }

        try {
            return Long.parseLong(matcher.group(1));
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private String extractBranchName(String details) {
        if (details == null || details.isBlank()) {
            return null;
        }

        String[] patterns = {
                "branch:\\s*(.*?)(?:\\s*\\(|$)",
                "from branch:\\s*(.*?)(?:\\s+to:|$)",
                "branch name:\\s*(.*?)(?:,|$)"
        };

        for (String pattern : patterns) {
            java.util.regex.Matcher matcher = java.util.regex.Pattern.compile(pattern, java.util.regex.Pattern.CASE_INSENSITIVE)
                    .matcher(details);
            if (matcher.find()) {
                return matcher.group(1).trim();
            }
        }

        return null;
    }
}
