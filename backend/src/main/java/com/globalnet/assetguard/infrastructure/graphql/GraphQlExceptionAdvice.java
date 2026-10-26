package com.globalnet.assetguard.infrastructure.graphql;

import graphql.GraphQLError;
import graphql.GraphqlErrorBuilder;
import graphql.schema.DataFetchingEnvironment;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.graphql.data.method.annotation.GraphQlExceptionHandler;
import org.springframework.graphql.execution.ErrorType;
import org.springframework.web.bind.annotation.ControllerAdvice;

/** Convierte las excepciones de los resolvers en errores GraphQL con su clasificacion. */
@ControllerAdvice
public class GraphQlExceptionAdvice {

    private static final Logger LOGGER = LoggerFactory.getLogger(GraphQlExceptionAdvice.class);

    @GraphQlExceptionHandler
    public GraphQLError handleApiException(ApiException exception, DataFetchingEnvironment environment) {
        return GraphqlErrorBuilder.newError(environment)
                .message(exception.getMessage())
                .errorType(exception.getErrorType())
                .build();
    }

    @GraphQlExceptionHandler
    public GraphQLError handleDataIntegrity(
            DataIntegrityViolationException exception,
            DataFetchingEnvironment environment) {
        LOGGER.warn("Error de integridad en el campo {}", environment.getField().getName(), exception);
        return GraphqlErrorBuilder.newError(environment)
                .message("La operación viola una restricción de la base de datos.")
                .errorType(ErrorType.BAD_REQUEST)
                .build();
    }

    @GraphQlExceptionHandler
    public GraphQLError handleUnexpected(Exception exception, DataFetchingEnvironment environment) {
        LOGGER.error("Error inesperado en el campo {}", environment.getField().getName(), exception);
        return GraphqlErrorBuilder.newError(environment)
                .message("Ocurrió un error inesperado al procesar la solicitud.")
                .errorType(ErrorType.INTERNAL_ERROR)
                .build();
    }
}
