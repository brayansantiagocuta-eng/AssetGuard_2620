package com.globalnet.assetguard.application;

import com.globalnet.assetguard.infrastructure.graphql.GraphQlModels;
import com.globalnet.assetguard.infrastructure.persistence.FinanceRepository;
import com.globalnet.assetguard.infrastructure.persistence.PageQuery;
import org.springframework.stereotype.Service;

/** Analisis financiero y consulta de auditoria (RF-013, RF-015). */
@Service
public class FinanceService {

    private final FinanceRepository financeRepository;
    private final AuditService auditService;

    public FinanceService(FinanceRepository financeRepository, AuditService auditService) {
        this.financeRepository = financeRepository;
        this.auditService = auditService;
    }

    public GraphQlModels.FinancialSummary summary() {
        return financeRepository.summary();
    }

    public GraphQlModels.Page<GraphQlModels.AuditLog> auditLogs(
            String action,
            String entityName,
            PageQuery query) {
        return auditService.findPage(action, entityName, query);
    }

    public GraphQlModels.Page<GraphQlModels.JobExecution> jobExecutions(PageQuery query) {
        return auditService.findJobExecutions(query);
    }
}
