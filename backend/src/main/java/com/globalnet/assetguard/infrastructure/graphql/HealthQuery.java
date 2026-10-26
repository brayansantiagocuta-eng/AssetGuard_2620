package com.globalnet.assetguard.infrastructure.graphql;

import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

@Controller
public class HealthQuery {

    @QueryMapping
    public String health() {
        return "UP";
    }
}
