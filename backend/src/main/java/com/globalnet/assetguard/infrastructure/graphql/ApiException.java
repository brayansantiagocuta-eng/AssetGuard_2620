package com.globalnet.assetguard.infrastructure.graphql;

import org.springframework.graphql.execution.ErrorType;

/** Error de negocio que se traduce a un error GraphQL con clasificacion. */
public class ApiException extends RuntimeException {

    private final ErrorType errorType;

    public ApiException(ErrorType errorType, String message) {
        super(message);
        this.errorType = errorType;
    }

    public ErrorType getErrorType() {
        return errorType;
    }

    public static ApiException badRequest(String message) {
        return new ApiException(ErrorType.BAD_REQUEST, message);
    }

    public static ApiException unauthorized(String message) {
        return new ApiException(ErrorType.UNAUTHORIZED, message);
    }

    public static ApiException forbidden(String message) {
        return new ApiException(ErrorType.FORBIDDEN, message);
    }

    public static ApiException notFound(String message) {
        return new ApiException(ErrorType.NOT_FOUND, message);
    }

    public static ApiException conflict(String message) {
        return new ApiException(ErrorType.BAD_REQUEST, message);
    }

    public static ApiException internal(String message) {
        return new ApiException(ErrorType.INTERNAL_ERROR, message);
    }
}
