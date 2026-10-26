package com.globalnet.assetguard.infrastructure.graphql;

import com.globalnet.assetguard.application.UserService;
import com.globalnet.assetguard.domain.RoleType;
import com.globalnet.assetguard.domain.UserStatus;
import com.globalnet.assetguard.infrastructure.persistence.PageQuery;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

@Controller
public class UserGraphQlController {

    private final UserService userService;
    private final GraphQlAuthorization authorization;

    public UserGraphQlController(UserService userService, GraphQlAuthorization authorization) {
        this.userService = userService;
        this.authorization = authorization;
    }

    @QueryMapping
    public GraphQlModels.Page<GraphQlModels.User> users(
            @Argument("pagination") GraphQlInputs.PaginationInput pagination,
            @Argument("role") RoleType role,
            @Argument("status") UserStatus status) {
        authorization.requireRole(RoleType.ADMIN);
        PageQuery query = PageQuery.of(
                pagination == null ? null : pagination.page(),
                pagination == null ? null : pagination.size());
        return userService.findPage(role, status, query);
    }

    @QueryMapping
    public GraphQlModels.User userById(@Argument("id") long id) {
        authorization.requireRole(RoleType.ADMIN);
        return userService.findById(id);
    }

    @MutationMapping
    public GraphQlModels.User createUser(@Argument("input") GraphQlInputs.CreateUserInput input) {
        authorization.requireRole(RoleType.ADMIN);
        return userService.create(input);
    }

    @MutationMapping
    public GraphQlModels.User updateUser(
            @Argument("id") long id,
            @Argument("input") GraphQlInputs.UpdateUserInput input) {
        authorization.requireRole(RoleType.ADMIN);
        return userService.update(id, input);
    }

    @MutationMapping
    public GraphQlModels.User resetUserPassword(
            @Argument("id") long id,
            @Argument("newPassword") String newPassword) {
        authorization.requireRole(RoleType.ADMIN);
        return userService.resetPassword(id, newPassword);
    }
}
