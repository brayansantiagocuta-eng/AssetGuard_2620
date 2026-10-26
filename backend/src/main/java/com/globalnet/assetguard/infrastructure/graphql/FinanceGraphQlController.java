package com.globalnet.assetguard.infrastructure.graphql;

import com.globalnet.assetguard.application.FinanceService;
import com.globalnet.assetguard.application.OverdueJobService;
import com.globalnet.assetguard.domain.RoleType;
import com.globalnet.assetguard.infrastructure.persistence.PageQuery;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

@Controller
public class FinanceGraphQlController {

    private final FinanceService financeService;
    private final OverdueJobService overdueJobService;
    private final GraphQlAuthorization authorization;

    public FinanceGraphQlController(
            FinanceService financeService,
            OverdueJobService overdueJobService,
            GraphQlAuthorization authorization) {
        this.financeService = financeService;
        this.overdueJobService = overdueJobService;
        this.authorization = authorization;
    }

    @QueryMapping
    public GraphQlModels.FinancialSummary financialSummary() {
        authorization.requireRole(RoleType.ADMIN);
        return financeService.summary();
    }

    @QueryMapping
    public GraphQlModels.Page<GraphQlModels.AuditLog> auditLogs(
            @Argument("pagination") GraphQlInputs.PaginationInput pagination,
            @Argument("action") String action,
            @Argument("entityName") String entityName) {
        authorization.requireRole(RoleType.ADMIN);
        return financeService.auditLogs(
                action,
                entityName,
                PageQuery.of(
                        pagination == null ? null : pagination.page(),
                        pagination == null ? null : pagination.size()));
    }

    @QueryMapping
    public GraphQlModels.Page<GraphQlModels.JobExecution> jobExecutions(
            @Argument("pagination") GraphQlInputs.PaginationInput pagination) {
        authorization.requireRole(RoleType.ADMIN);
        return financeService.jobExecutions(
                PageQuery.of(
                        pagination == null ? null : pagination.page(),
                        pagination == null ? null : pagination.size()));
    }

    @MutationMapping
    public int runDailyOverdueJob() {
        authorization.requireRole(RoleType.ADMIN);
        return overdueJobService.run();
    }
}
