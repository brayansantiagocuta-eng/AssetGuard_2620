package com.globalnet.assetguard.infrastructure.graphql;

import com.globalnet.assetguard.infrastructure.auth.AuthenticatedUser;
import com.globalnet.assetguard.infrastructure.auth.UserRepository;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

@Controller
public class AuthGraphQlController {

    private final GraphQlAuthorization authorization;
    private final UserRepository userRepository;

    public AuthGraphQlController(GraphQlAuthorization authorization, UserRepository userRepository) {
        this.authorization = authorization;
        this.userRepository = userRepository;
    }

    @QueryMapping
    public GraphQlModels.User me() {
        AuthenticatedUser user = authorization.requireUser();
        return userRepository.findViewById(user.id())
                .orElseThrow(() -> ApiException.unauthorized("La sesión ya no es válida."));
    }
}
