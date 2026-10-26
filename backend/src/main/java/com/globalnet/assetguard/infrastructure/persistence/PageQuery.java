package com.globalnet.assetguard.infrastructure.persistence;

import com.globalnet.assetguard.infrastructure.graphql.GraphQlModels;
import java.util.List;

public record PageQuery(int page, int size) {

    public static final int MAX_SIZE = 100;

    public static PageQuery of(Integer page, Integer size) {
        int safePage = page == null ? 0 : Math.max(0, page);
        int safeSize = size == null ? 10 : size;
        safeSize = Math.max(1, Math.min(MAX_SIZE, safeSize));
        return new PageQuery(safePage, safeSize);
    }

    public int offset() {
        return page * size;
    }

    public static <T> GraphQlModels.Page<T> toPage(List<T> items, PageQuery query, long total) {
        int totalPages = total == 0 ? 0 : (int) Math.ceil(total / (double) query.size());
        GraphQlModels.PageInfo info = new GraphQlModels.PageInfo(
                query.page(),
                query.size(),
                (int) total,
                totalPages,
                query.page() + 1 < totalPages,
                query.page() > 0 && totalPages > 0);
        return new GraphQlModels.Page<>(items, info);
    }
}
