import { BaseController, type ControllerResult } from "@/controllers/base/base-controller";
import type { RoleCreateInputDto } from "@/models/dto/role-create-input";
import type { RoleDetailDto } from "@/models/dto/role-detail";
import type { RoleListItemDto } from "@/models/dto/role-list-item";
import type { RoleUpdateInputDto } from "@/models/dto/role-update-input";
import { createRoleSchema, updateRoleSchema } from "@/models/validators/role-validator";
import { RoleService } from "@/services/roles/role-service";

type RoleContext = {
  companyId: string;
  userId: string;
  isPlatformAdmin: boolean;
  permissions: string[];
};

export class RoleController extends BaseController {
  constructor(private readonly roleService: RoleService) {
    super();
  }

  async create(
    context: RoleContext,
    input: RoleCreateInputDto,
  ): Promise<ControllerResult<RoleListItemDto>> {
    try {
      const payload = createRoleSchema.parse(input);
      const role = await this.roleService.createRole(context, payload);

      if (!role) {
        return this.fail("Role could not be created.");
      }

      return this.ok({
        id: role.id,
        name: role.name,
        code: role.code,
        isSystem: role.isSystem,
        permissionCodes: role.rolePermissions.map((item) => item.permission.code),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async list(
    context: RoleContext,
    companyId: string,
  ): Promise<ControllerResult<RoleListItemDto[]>> {
    try {
      const roles = await this.roleService.listRoles(context, companyId);

      return this.ok(
        roles.map((role) => ({
          id: role.id,
          name: role.name,
          code: role.code,
          isSystem: role.isSystem,
          permissionCodes: role.rolePermissions.map((item) => item.permission.code),
        })),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async listPermissions(
    context: RoleContext,
  ): Promise<ControllerResult<Array<{ code: string; module: string; action: string }>>> {
    try {
      const permissions = await this.roleService.listPermissions(context);

      return this.ok(
        permissions.map((permission) => ({
          code: permission.code,
          module: permission.module,
          action: permission.action,
        })),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async show(
    context: RoleContext,
    companyId: string,
    roleId: string,
  ): Promise<ControllerResult<RoleDetailDto>> {
    try {
      const role = await this.roleService.getRole(context, companyId, roleId);

      return this.ok({
        id: role.id,
        companyId: role.companyId,
        name: role.name,
        code: role.code,
        isSystem: role.isSystem,
        permissionCodes: role.rolePermissions.map((item) => item.permission.code),
        createdAt: role.createdAt.toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async update(
    context: RoleContext,
    companyId: string,
    roleId: string,
    input: RoleUpdateInputDto,
  ): Promise<ControllerResult<RoleDetailDto>> {
    try {
      const payload = updateRoleSchema.parse(input);
      const role = await this.roleService.updateRole(context, companyId, roleId, payload);

      if (!role) {
        return this.fail("Role could not be updated.");
      }

      return this.ok({
        id: role.id,
        companyId: role.companyId,
        name: role.name,
        code: role.code,
        isSystem: role.isSystem,
        permissionCodes: role.rolePermissions.map((item) => item.permission.code),
        createdAt: role.createdAt.toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }
}
