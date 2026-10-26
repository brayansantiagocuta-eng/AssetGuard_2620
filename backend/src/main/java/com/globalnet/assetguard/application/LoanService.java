package com.globalnet.assetguard.application;

import com.globalnet.assetguard.domain.LoanRequestStatus;
import com.globalnet.assetguard.domain.LoanStatus;
import com.globalnet.assetguard.infrastructure.auth.PasswordHasher;
import com.globalnet.assetguard.infrastructure.auth.UserRepository;
import com.globalnet.assetguard.infrastructure.graphql.ApiException;
import com.globalnet.assetguard.infrastructure.graphql.GraphQlInputs;
import com.globalnet.assetguard.infrastructure.graphql.GraphQlModels;
import com.globalnet.assetguard.infrastructure.persistence.AssetRepository;
import com.globalnet.assetguard.infrastructure.persistence.LoanRepository;
import com.globalnet.assetguard.infrastructure.persistence.PageQuery;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Flujo completo de prestamos: solicitud, aprobacion, PIN y devolucion (RF-009 a RF-011). */
@Service
public class LoanService {

    private static final int OTP_TTL_MINUTES = 5;
    private static final int OTP_MAX_ATTEMPTS = 3;
    private static final String ENTITY = "loans";

    private final LoanRepository loanRepository;
    private final AssetRepository assetRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;
    private final PasswordHasher passwordHasher;
    private final SecureRandom secureRandom = new SecureRandom();

    public LoanService(
            LoanRepository loanRepository,
            AssetRepository assetRepository,
            UserRepository userRepository,
            AuditService auditService,
            PasswordHasher passwordHasher) {
        this.loanRepository = loanRepository;
        this.assetRepository = assetRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
        this.passwordHasher = passwordHasher;
    }

    // ------------------------------------------------------------------ consultas

    public GraphQlModels.Page<GraphQlModels.LoanRequest> findRequests(
            LoanRequestStatus status,
            PageQuery query) {
        GraphQlModels.Page<LoanRepository.RequestRow> page = loanRepository.findRequests(
                status == null ? null : status.name(), query);
        return new GraphQlModels.Page<>(
                page.items().stream().map(this::toRequestView).toList(),
                page.pageInfo());
    }

    public GraphQlModels.LoanRequest findRequest(long id) {
        return toRequestView(requireRequest(id));
    }

    public GraphQlModels.Page<GraphQlModels.Loan> findActiveLoans(PageQuery query) {
        return mapLoans(loanRepository.findLoans(null, null, query));
    }

    public GraphQlModels.Page<GraphQlModels.Loan> findMyHistory(
            long technicianId,
            LoanStatus status,
            PageQuery query) {
        return mapLoans(loanRepository.findLoans(
                status == null ? null : status.name(), technicianId, query));
    }

    // ------------------------------------------------------------------ solicitud

    @Transactional
    public GraphQlModels.LoanRequest createRequest(long technicianId, GraphQlInputs.CreateLoanRequestInput input) {
        if (input == null || input.assetId() == null) {
            throw ApiException.badRequest("Debe indicar el activo solicitado.");
        }
        GraphQlModels.Asset asset = assetRepository.findById(input.assetId())
                .orElseThrow(() -> ApiException.notFound("No se encontró el activo solicitado."));
        if (!"AVAILABLE".equals(asset.status())) {
            throw ApiException.conflict("El activo no está disponible para préstamo (estado " + asset.status() + ").");
        }
        if (loanRepository.hasOpenRequest(asset.id())) {
            throw ApiException.conflict("El activo ya tiene una solicitud pendiente o aprobada.");
        }
        if (asset.calibrationStatus() != null && !asset.calibrationStatus().isCompliant()) {
            throw ApiException.conflict(
                    "El activo no es elegible: " + asset.calibrationStatus().warningMessage());
        }

        LocalDate requiredDate = parseDate(input.requiredDate(), "la fecha requerida");
        LocalDate expectedReturn = parseDate(input.expectedReturnDate(), "la fecha esperada de devolución");
        if (requiredDate.isBefore(LocalDate.now())) {
            throw ApiException.badRequest("La fecha requerida no puede ser anterior a hoy.");
        }
        if (expectedReturn.isBefore(requiredDate)) {
            throw ApiException.badRequest("La devolución esperada no puede ser anterior a la fecha requerida.");
        }
        String motive = required(input.motive(), "El motivo de la solicitud es obligatorio.");

        long id = loanRepository.insertRequest(
                technicianId, asset.id(), requiredDate, expectedReturn, motive);
        assetRepository.updateStatus(asset.id(), "RESERVED");
        auditService.record(
                "CREATE_LOAN_REQUEST",
                "loan_requests",
                id,
                "{\"asset\":\"" + asset.serialNumber() + "\"}",
                "{\"status\":\"REQUESTED\"}");
        return findRequest(id);
    }

    @Transactional
    public GraphQlModels.LoanRequest approve(long id) {
        LoanRepository.RequestRow request = requireRequest(id);
        if (!LoanRequestStatus.REQUESTED.name().equals(request.status())) {
            throw ApiException.conflict("Solo se pueden aprobar solicitudes en estado REQUESTED.");
        }
        GraphQlModels.Asset asset = assetRepository.findById(request.assetId())
                .orElseThrow(() -> ApiException.notFound("No se encontró el activo de la solicitud."));
        if ("RETIRED".equals(asset.status()) || "MAINTENANCE".equals(asset.status())) {
            throw ApiException.conflict("El activo está en " + asset.status() + " y no puede prestarse.");
        }
        if (loanRepository.hasActiveLoan(asset.id())) {
            throw ApiException.conflict("El activo ya tiene un préstamo activo.");
        }
        loanRepository.updateRequestStatus(id, LoanRequestStatus.APPROVED.name());
        assetRepository.updateStatus(asset.id(), "RESERVED");
        auditService.record("APPROVE_LOAN_REQUEST", "loan_requests", id,
                "{\"status\":\"REQUESTED\"}", "{\"status\":\"APPROVED\"}");
        return findRequest(id);
    }

    @Transactional
    public GraphQlModels.LoanRequest reject(long id, String reason) {
        LoanRepository.RequestRow request = requireRequest(id);
        if (!LoanRequestStatus.REQUESTED.name().equals(request.status())) {
            throw ApiException.conflict("Solo se pueden rechazar solicitudes en estado REQUESTED.");
        }
        loanRepository.updateRequestStatus(id, LoanRequestStatus.REJECTED.name());
        if (!loanRepository.hasOpenRequestExcluding(request.assetId(), id)) {
            assetRepository.findStatus(request.assetId())
                    .filter("RESERVED"::equals)
                    .ifPresent(status -> assetRepository.updateStatus(request.assetId(), "AVAILABLE"));
        }
        String detail = reason == null || reason.isBlank() ? "" : reason.trim();
        auditService.record("REJECT_LOAN_REQUEST", "loan_requests", id,
                "{\"status\":\"REQUESTED\"}",
                "{\"status\":\"REJECTED\",\"reason\":\"" + detail.replace("\"", "'") + "\"}");
        return findRequest(id);
    }

    // ------------------------------------------------------------------ OTP

    @Transactional
    public GraphQlModels.OtpTokenInfo generateOtp(long loanRequestId) {
        LoanRepository.RequestRow request = requireRequest(loanRequestId);
        if (!LoanRequestStatus.APPROVED.name().equals(request.status())) {
            throw ApiException.conflict("La solicitud debe estar APPROVED para generar el PIN.");
        }
        loanRepository.invalidateOtps(loanRequestId);

        String pin = String.format("%06d", secureRandom.nextInt(1_000_000));
        OffsetDateTime expiresAt = OffsetDateTime.now().plusMinutes(OTP_TTL_MINUTES);
        long otpId = loanRepository.insertOtp(loanRequestId, passwordHasher.hashBcrypt(pin), expiresAt);
        auditService.record("GENERATE_LOAN_OTP", "otp_tokens", otpId, null,
                "{\"loanRequestId\":" + loanRequestId + "}");
        return new GraphQlModels.OtpTokenInfo(
                otpId, expiresAt.toString(), OTP_MAX_ATTEMPTS, false, pin);
    }

    @Transactional
    public GraphQlModels.Loan validateOtp(
            long loanRequestId,
            String pin,
            long actingUserId,
            String actingRole) {
        LoanRepository.RequestRow request = requireRequest(loanRequestId);
        if (!LoanRequestStatus.APPROVED.name().equals(request.status())) {
            throw ApiException.conflict("La solicitud debe estar APPROVED para validar el PIN.");
        }
        if ("TECHNICIAN".equals(actingRole) && actingUserId != request.technicianId()) {
            throw ApiException.forbidden("Solo el técnico que solicitó el préstamo puede validar el PIN.");
        }
        if (pin == null || pin.isBlank()) {
            throw ApiException.badRequest("El PIN es obligatorio.");
        }
        LoanRepository.OtpRow otp = loanRepository.findActiveOtp(loanRequestId)
                .orElseThrow(() -> ApiException.badRequest("No hay un PIN vigente para esta solicitud."));
        if (otp.expiresAt().isBefore(OffsetDateTime.now())) {
            throw ApiException.badRequest("El PIN expiró. Genere uno nuevo.");
        }
        if (otp.attempts() >= OTP_MAX_ATTEMPTS) {
            throw ApiException.badRequest("Se superó el número de intentos. Genere un nuevo PIN.");
        }
        if (!passwordHasher.matches(pin.trim(), otp.pinHash())) {
            loanRepository.incrementOtpAttempts(otp.id());
            int remaining = Math.max(0, OTP_MAX_ATTEMPTS - (otp.attempts() + 1));
            auditService.record("OTP_FAILED", "otp_tokens", otp.id(), null,
                    "{\"remainingAttempts\":" + remaining + "}");
            throw ApiException.badRequest("PIN incorrecto. Intentos restantes: " + remaining + ".");
        }
        if (loanRepository.findLoanByRequestId(loanRequestId).isPresent()) {
            throw ApiException.conflict("Esta solicitud ya tiene un préstamo registrado.");
        }

        loanRepository.markOtpUsed(otp.id());
        long loanId = loanRepository.insertLoan(loanRequestId, request.assetId());
        assetRepository.updateStatus(request.assetId(), "ON_LOAN");
        auditService.record("LOAN_DELIVERED", ENTITY, loanId,
                "{\"loanRequestId\":" + loanRequestId + "}", "{\"status\":\"ACTIVE\"}");
        return toLoanView(loanRepository.findLoanById(loanId)
                .orElseThrow(() -> ApiException.internal("No se pudo registrar el préstamo.")));
    }

    // ------------------------------------------------------------------ devolucion

    @Transactional
    public GraphQlModels.Loan returnLoan(long loanId, boolean damaged, String notes) {
        LoanRepository.LoanRow loan = loanRepository.findLoanById(loanId)
                .orElseThrow(() -> ApiException.notFound("No se encontró el préstamo."));
        if (!LoanStatus.ACTIVE.name().equals(loan.status())
                && !LoanStatus.OVERDUE.name().equals(loan.status())) {
            throw ApiException.conflict("El préstamo ya fue devuelto.");
        }
        loanRepository.markReturned(loanId, notes);
        assetRepository.updateStatus(loan.assetId(), damaged ? "MAINTENANCE" : "AVAILABLE");
        auditService.record("LOAN_RETURNED", ENTITY, loanId,
                "{\"status\":\"" + loan.status() + "\"}",
                "{\"status\":\"RETURNED\",\"damaged\":" + damaged + "}");
        return toLoanView(loanRepository.findLoanById(loanId)
                .orElseThrow(() -> ApiException.internal("No se pudo registrar la devolución.")));
    }

    // ------------------------------------------------------------------ mapeo

    private GraphQlModels.Page<GraphQlModels.Loan> mapLoans(
            GraphQlModels.Page<LoanRepository.LoanRow> page) {
        return new GraphQlModels.Page<>(
                page.items().stream().map(this::toLoanView).toList(),
                page.pageInfo());
    }

    private LoanRepository.RequestRow requireRequest(long id) {
        return loanRepository.findRequestById(id)
                .orElseThrow(() -> ApiException.notFound("No se encontró la solicitud de préstamo."));
    }

    private GraphQlModels.LoanRequest toRequestView(LoanRepository.RequestRow row) {
        GraphQlModels.User technician = userRepository.findViewById(row.technicianId()).orElse(null);
        GraphQlModels.Asset asset = assetRepository.findById(row.assetId()).orElse(null);
        GraphQlModels.OtpTokenInfo activeOtp = loanRepository.findActiveOtp(row.id())
                .map(otp -> new GraphQlModels.OtpTokenInfo(
                        otp.id(),
                        otp.expiresAt().toString(),
                        Math.max(0, OTP_MAX_ATTEMPTS - otp.attempts()),
                        otp.used(),
                        null))
                .orElse(null);
        GraphQlModels.Loan loan = loanRepository.findLoanByRequestId(row.id())
                .map(this::toLoanView)
                .orElse(null);
        return new GraphQlModels.LoanRequest(
                row.id(), technician, asset, row.requestDate(), row.requiredDate(),
                row.expectedReturnDate(), row.motive(), row.status(), activeOtp, loan, row.createdAt());
    }

    private GraphQlModels.Loan toLoanView(LoanRepository.LoanRow row) {
        GraphQlModels.Asset asset = assetRepository.findById(row.assetId()).orElse(null);
        return new GraphQlModels.Loan(
                row.id(), row.loanRequestId(), asset, row.deliveryDate(),
                row.actualReturnDate(), row.status(), row.notes());
    }

    private static LocalDate parseDate(String value, String field) {
        if (value == null || value.isBlank()) {
            throw ApiException.badRequest("Debe indicar " + field + " en formato AAAA-MM-DD.");
        }
        try {
            return LocalDate.parse(value.trim());
        } catch (DateTimeParseException exception) {
            throw ApiException.badRequest("La fecha " + field + " debe tener el formato AAAA-MM-DD.");
        }
    }

    private static String required(String value, String message) {
        if (value == null || value.isBlank()) {
            throw ApiException.badRequest(message);
        }
        return value.trim();
    }
}
