package com.globalnet.assetguard.infrastructure.persistence;

import com.globalnet.assetguard.infrastructure.graphql.GraphQlModels;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class CatalogRepository {

    private final JdbcTemplate jdbcTemplate;

    public CatalogRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<GraphQlModels.Category> findCategories() {
        return jdbcTemplate.query(
                "SELECT id, name, useful_life_months FROM categories ORDER BY name",
                (rs, row) -> new GraphQlModels.Category(
                        rs.getLong("id"), rs.getString("name"), rs.getInt("useful_life_months")));
    }

    public List<GraphQlModels.Location> findLocations() {
        return jdbcTemplate.query(
                "SELECT id, name, type FROM locations ORDER BY name",
                (rs, row) -> new GraphQlModels.Location(
                        rs.getLong("id"), rs.getString("name"), rs.getString("type")));
    }

    public Optional<GraphQlModels.Category> findCategory(long id) {
        return jdbcTemplate.query(
                "SELECT id, name, useful_life_months FROM categories WHERE id = ?",
                (rs, row) -> new GraphQlModels.Category(
                        rs.getLong("id"), rs.getString("name"), rs.getInt("useful_life_months")),
                id).stream().findFirst();
    }

    public Optional<GraphQlModels.Location> findLocation(long id) {
        return jdbcTemplate.query(
                "SELECT id, name, type FROM locations WHERE id = ?",
                (rs, row) -> new GraphQlModels.Location(
                        rs.getLong("id"), rs.getString("name"), rs.getString("type")),
                id).stream().findFirst();
    }

    public Optional<Long> findCategoryIdByName(String name) {
        return jdbcTemplate.query(
                "SELECT id FROM categories WHERE LOWER(name) = LOWER(?)",
                (rs, row) -> rs.getLong("id"),
                name).stream().findFirst();
    }

    public Optional<Long> findLocationIdByName(String name) {
        return jdbcTemplate.query(
                "SELECT id FROM locations WHERE LOWER(name) = LOWER(?)",
                (rs, row) -> rs.getLong("id"),
                name).stream().findFirst();
    }
}
