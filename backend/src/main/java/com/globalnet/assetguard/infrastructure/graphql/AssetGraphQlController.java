package com.globalnet.assetguard.infrastructure.graphql;

import com.globalnet.assetguard.application.AssetService;
import com.globalnet.assetguard.application.CalibrationService;
import com.globalnet.assetguard.domain.AssetStatus;
import com.globalnet.assetguard.domain.RoleType;
import com.globalnet.assetguard.infrastructure.auth.AuthenticatedUser;
import com.globalnet.assetguard.infrastructure.bulk.AssetBulkFileAdapter;
import com.globalnet.assetguard.infrastructure.persistence.PageQuery;
import java.util.List;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

@Controller
public class AssetGraphQlController {

    private final AssetService assetService;
    private final CalibrationService calibrationService;
    private final AssetBulkFileAdapter bulkFileAdapter;
    private final GraphQlAuthorization authorization;

    public AssetGraphQlController(
            AssetService assetService,
            CalibrationService calibrationService,
            AssetBulkFileAdapter bulkFileAdapter,
            GraphQlAuthorization authorization) {
        this.assetService = assetService;
        this.calibrationService = calibrationService;
        this.bulkFileAdapter = bulkFileAdapter;
        this.authorization = authorization;
    }

    @QueryMapping
    public GraphQlModels.Page<GraphQlModels.Asset> assets(
            @Argument("pagination") GraphQlInputs.PaginationInput pagination,
            @Argument("status") AssetStatus status,
            @Argument("categoryId") Long categoryId,
            @Argument("search") String search) {
        authorization.requireUser();
        PageQuery query = PageQuery.of(
                pagination == null ? null : pagination.page(),
                pagination == null ? null : pagination.size());
        return assetService.findPage(status, categoryId, search, query);
    }

    @QueryMapping
    public GraphQlModels.Asset assetById(@Argument("id") long id) {
        authorization.requireUser();
        return assetService.findById(id);
    }

    @QueryMapping
    public GraphQlModels.Asset assetBySerialNumber(@Argument("serialNumber") String serialNumber) {
        authorization.requireUser();
        return assetService.findBySerialNumber(serialNumber);
    }

    @QueryMapping
    public GraphQlModels.CalibrationStatus assetCalibrationStatus(@Argument("assetId") long assetId) {
        authorization.requireUser();
        return assetService.calibrationStatus(assetId);
    }

    @QueryMapping
    public List<GraphQlModels.Category> categories() {
        authorization.requireUser();
        return assetService.categories();
    }

    @QueryMapping
    public List<GraphQlModels.Location> locations() {
        authorization.requireUser();
        return assetService.locations();
    }

    @MutationMapping
    public GraphQlModels.Asset createAsset(@Argument("input") GraphQlInputs.CreateAssetInput input) {
        authorization.requireRole(RoleType.ADMIN);
        return assetService.create(input);
    }

    @MutationMapping
    public GraphQlModels.Asset updateAssetStatus(
            @Argument("id") long id,
            @Argument("status") AssetStatus status,
            @Argument("notes") String notes) {
        authorization.requireRole(RoleType.ADMIN, RoleType.INSPECTOR);
        return assetService.updateStatus(id, status, notes);
    }

    @MutationMapping
    public GraphQlModels.BulkUploadResult bulkUploadAssets(
            @Argument("assets") List<GraphQlInputs.BulkAssetRowInput> assets) {
        authorization.requireRole(RoleType.ADMIN);
        return assetService.bulkUpload(assets);
    }

    @MutationMapping
    public GraphQlModels.BulkUploadResult bulkUploadAssetsFile(
            @Argument("fileName") String fileName,
            @Argument("base64Content") String base64Content) {
        authorization.requireRole(RoleType.ADMIN);
        List<GraphQlInputs.BulkAssetRowInput> rows = bulkFileAdapter.parseBase64File(fileName, base64Content);
        return assetService.bulkUpload(rows);
    }

    @MutationMapping
    public GraphQlModels.Asset registerCalibration(
            @Argument("assetId") long assetId,
            @Argument("result") String result,
            @Argument("notes") String notes) {
        AuthenticatedUser inspector = authorization.requireRole(RoleType.ADMIN, RoleType.INSPECTOR);
        return calibrationService.register(assetId, result, notes, inspector.fullName());
    }
}
