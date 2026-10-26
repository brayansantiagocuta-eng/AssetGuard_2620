package com.globalnet.assetguard.application;

import com.globalnet.assetguard.infrastructure.persistence.AuditRepository;
import com.globalnet.assetguard.infrastructure.persistence.LoanRepository;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Tarea diaria de vencimientos (RF-012 / HU-014). Idempotente. */
@Service
public class OverdueJobService {

    public static final String JOB_NAME = "DAILY_OVERDUE_JOB";

    private static final Logger LOGGER = LoggerFactory.getLogger(OverdueJobService.class);

    private final LoanRepository loanRepository;
    private final AuditRepository auditRepository;
    private final TransactionTemplate transactionTemplate;

    public OverdueJobService(
            LoanRepository loanRepository,
            AuditRepository auditRepository,
            PlatformTransactionManager transactionManager) {
        this.loanRepository = loanRepository;
        this.auditRepository = auditRepository;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    public int run() {
        try {
            Integer processed = transactionTemplate.execute(status -> {
                List<LoanRepository.OverdueRow> overdue = loanRepository.markOverdueLoans();
                for (LoanRepository.OverdueRow row : overdue) {
                    auditRepository.insert(
                            null,
                            "LOAN_OVERDUE",
                            "loans",
                            row.loanId(),
                            "{\"status\":\"ACTIVE\"}",
                            "{\"status\":\"OVERDUE\",\"technicianId\":" + row.technicianId() + "}",
                            "scheduler");
                }
                auditRepository.insertJobExecution(
                        JOB_NAME,
                        "SUCCESS",
                        overdue.size(),
                        "Préstamos migrados a OVERDUE: " + overdue.size());
                return overdue.size();
            });
            return processed == null ? 0 : processed;
        } catch (RuntimeException exception) {
            LOGGER.error("La tarea diaria de vencimientos falló", exception);
            auditRepository.insertJobExecution(JOB_NAME, "FAILED", 0, exception.getMessage());
            throw exception;
        }
    }
}
