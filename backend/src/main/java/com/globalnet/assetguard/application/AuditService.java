package com.globalnet.assetguard.application;

import com.globalnet.assetguard.infrastructure.auth.AuthenticatedUser;
import com.globalnet.assetguard.infrastructure.graphql.GraphQlAuthorization;
import com.globalnet.assetguard.infrastructure.graphql.GraphQlModels;
import com.globalnet.assetguard.infrastructure.persistence.AuditRepository;
import com.globalnet.assetguard.infrastructure.persistence.PageQuery;
import org.springframework.stereotype.Service;

/** Registro append-only de operaciones sensibles (RNF-014). */
@Service
public class AuditService {

    private final AuditRepository auditRepository;
    private final GraphQlAuthorization authorization;

    public AuditService(AuditRepository auditRepository, GraphQlAuthorization authorization) {
        this.auditRepository = auditRepository;
        this.authorization = authorization;
    }

    public void record(String action, String entityName, Long entityId, String oldValue, String newValue) {
        AuthenticatedUser user = authorization.currentUser();
        auditRepository.insert(
                user == null ? null : user.id(),
                action,
                entityName,
                entityId,
                oldValue,
                newValue,
                authorization.clientIp());
    }

    public void recordSystem(String action, String entityName, Long entityId, String oldValue, String newValue) {
        auditRepository.insert(null, action, entityName, entityId, oldValue, newValue, "scheduler");
    }

    public GraphQlModels.Page<GraphQlModels.AuditLog> findPage(
            String action,
            String entityName,
            PageQuery query) {
        return auditRepository.findPage(action, entityName, query);
    }

    public GraphQlModels.Page<GraphQlModels.JobExecution> findJobExecutions(PageQuery query) {
        return auditRepository.findJobExecutions(query);
    }
}
