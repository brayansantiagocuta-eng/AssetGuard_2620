package com.globalnet.assetguard.infrastructure.persistence;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.globalnet.assetguard.infrastructure.graphql.GraphQlModels;
import java.util.List;
import org.junit.jupiter.api.Test;

class PageQueryTest {

    @Test
    void appliesDefaultsAndLimits() {
        PageQuery defaults = PageQuery.of(null, null);
        assertEquals(0, defaults.page());
        assertEquals(10, defaults.size());

        PageQuery negative = PageQuery.of(-5, 0);
        assertEquals(0, negative.page());
        assertEquals(1, negative.size());

        PageQuery tooLarge = PageQuery.of(2, 5000);
        assertEquals(PageQuery.MAX_SIZE, tooLarge.size());
        assertEquals(200, tooLarge.offset());
    }

    @Test
    void computesPageInfoForTheFirstPage() {
        GraphQlModels.Page<String> page = PageQuery.toPage(List.of("a", "b"), PageQuery.of(0, 2), 5);
        GraphQlModels.PageInfo info = page.pageInfo();

        assertEquals(0, info.currentPage());
        assertEquals(2, info.pageSize());
        assertEquals(5, info.totalElements());
        assertEquals(3, info.totalPages());
        assertTrue(info.hasNextPage());
        assertFalse(info.hasPreviousPage());
    }

    @Test
    void computesPageInfoForAnEmptyResult() {
        GraphQlModels.Page<String> page = PageQuery.toPage(List.of(), PageQuery.of(0, 10), 0);
        GraphQlModels.PageInfo info = page.pageInfo();

        assertEquals(0, info.totalPages());
        assertFalse(info.hasNextPage());
        assertFalse(info.hasPreviousPage());
    }
}
