package com.globalnet.assetguard.infrastructure.graphql;

import com.globalnet.assetguard.application.LoanService;
import com.globalnet.assetguard.domain.LoanRequestStatus;
import com.globalnet.assetguard.domain.LoanStatus;
import com.globalnet.assetguard.domain.RoleType;
import com.globalnet.assetguard.infrastructure.auth.AuthenticatedUser;
import com.globalnet.assetguard.infrastructure.persistence.PageQuery;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

@Controller
public class LoanGraphQlController {

    private final LoanService loanService;
    private final GraphQlAuthorization authorization;

    public LoanGraphQlController(LoanService loanService, GraphQlAuthorization authorization) {
        this.loanService = loanService;
        this.authorization = authorization;
    }

    @QueryMapping
    public GraphQlModels.Page<GraphQlModels.LoanRequest> loanRequests(
            @Argument("pagination") GraphQlInputs.PaginationInput pagination,
            @Argument("status") LoanRequestStatus status) {
        authorization.requireRole(RoleType.ADMIN, RoleType.INSPECTOR, RoleType.TECHNICIAN);
        return loanService.findRequests(status, page(pagination));
    }

    @QueryMapping
    public GraphQlModels.Page<GraphQlModels.Loan> activeLoans(
            @Argument("pagination") GraphQlInputs.PaginationInput pagination) {
        authorization.requireRole(RoleType.ADMIN, RoleType.INSPECTOR);
        return loanService.findActiveLoans(page(pagination));
    }

    @QueryMapping
    public GraphQlModels.Page<GraphQlModels.Loan> myLoanHistory(
            @Argument("pagination") GraphQlInputs.PaginationInput pagination,
            @Argument("status") LoanStatus status) {
        AuthenticatedUser user = authorization.requireUser();
        return loanService.findMyHistory(user.id(), status, page(pagination));
    }

    @MutationMapping
    public GraphQlModels.LoanRequest createLoanRequest(
            @Argument("input") GraphQlInputs.CreateLoanRequestInput input) {
        AuthenticatedUser user = authorization.requireRole(
                RoleType.TECHNICIAN, RoleType.INSPECTOR, RoleType.ADMIN);
        return loanService.createRequest(user.id(), input);
    }

    @MutationMapping
    public GraphQlModels.LoanRequest approveLoanRequest(@Argument("id") long id) {
        authorization.requireRole(RoleType.ADMIN, RoleType.INSPECTOR);
        return loanService.approve(id);
    }

    @MutationMapping
    public GraphQlModels.LoanRequest rejectLoanRequest(
            @Argument("id") long id,
            @Argument("reason") String reason) {
        authorization.requireRole(RoleType.ADMIN, RoleType.INSPECTOR);
        return loanService.reject(id, reason);
    }

    @MutationMapping
    public GraphQlModels.OtpTokenInfo generateLoanOtp(@Argument("loanRequestId") long loanRequestId) {
        authorization.requireRole(RoleType.ADMIN, RoleType.INSPECTOR, RoleType.TECHNICIAN);
        return loanService.generateOtp(loanRequestId);
    }

    @MutationMapping
    public GraphQlModels.Loan validateLoanOTP(
            @Argument("loanRequestId") long loanRequestId,
            @Argument("pin") String pin) {
        AuthenticatedUser user = authorization.requireRole(
                RoleType.TECHNICIAN, RoleType.INSPECTOR, RoleType.ADMIN);
        return loanService.validateOtp(loanRequestId, pin, user.id(), user.role());
    }

    @MutationMapping
    public GraphQlModels.Loan returnLoan(
            @Argument("loanId") long loanId,
            @Argument("damaged") boolean damaged,
            @Argument("notes") String notes) {
        authorization.requireRole(RoleType.ADMIN, RoleType.INSPECTOR);
        return loanService.returnLoan(loanId, damaged, notes);
    }

    private static PageQuery page(GraphQlInputs.PaginationInput pagination) {
        return PageQuery.of(
                pagination == null ? null : pagination.page(),
                pagination == null ? null : pagination.size());
    }
}
