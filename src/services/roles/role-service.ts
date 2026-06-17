import { AuthorizationError } from "@/lib/auth/auth-errors";
import { PERMISSIONS } from "@/lib/permissions/permission-types";
import type { TenantContext } from "@/lib/tenant/tenant-context";
import type { RoleCreateInputDto } from "@/models/dto/role-create-input";
import type { RoleUpdateInputDto } from "@/models/dto/role-update-input";
import { PermissionRepository } from "@/repositories/permissions/permission-repository";
import { RoleRepository } from "@/repositories/roles/role-repository";
import { AuthorizationService } from "@/services/auth/authorization-service";
import { BaseService } from "@/services/base/base-service";

export class RoleService extends BaseService {
  constructor(
    private readonly roleRepository: RoleRepository,
    private readonly permissionRepository: PermissionRepository,
    private readonly authorizationService: AuthorizationService,
  ) {
    super();
  }

  async createRole(
    context: TenantContext & { permissions: string[] },
    input: RoleCreateInputDto,
  ) {
    const tenantContext = this.requireContext(context);

    this.authorizationService.ensurePermission(
      context.permissions,
      PERMISSIONS.usersCreate,
    );

    if (
      input.companyId &&
      !tenantContext.isPlatformAdmin &&
      tenantContext.companyId !== input.companyId
    ) {
      throw new AuthorizationError("You can only create roles inside your company.");
    }

    const availablePermissions = await this.permissionRepository.listAll();
    const availableCodes = new Set(availablePermissions.map((item) => item.code));

    for (const permissionCode of input.permissionCodes) {
      if (!availableCodes.has(permissionCode)) {
        throw new Error(`Unknown permission: ${permissionCode}`);
      }
    }

    return this.roleRepository.create(input);
  }

  async listRoles(context: TenantContext & { permissions: string[] }, companyId: string) {
    const tenantContext = this.requireContext(context);

    this.authorizationService.ensurePermission(
      context.permissions,
      PERMISSIONS.usersView,
    );

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only list roles inside your company.");
    }

    return this.roleRepository.listByCompany(companyId);
  }

  async listPermissions(context: TenantContext & { permissions: string[] }) {
    this.requireContext(context);

    this.authorizationService.ensurePermission(
      context.permissions,
      PERMISSIONS.usersView,
    );

    return this.permissionRepository.listAll();
  }

  async getRole(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    roleId: string,
  ) {
    const tenantContext = this.requireContext(context);

    this.authorizationService.ensurePermission(
      context.permissions,
      PERMISSIONS.usersView,
    );

    const role = await this.roleRepository.findById(roleId);

    if (!role) {
      throw new Error("Role not found.");
    }

    if (
      role.companyId &&
      !tenantContext.isPlatformAdmin &&
      tenantContext.companyId !== role.companyId
    ) {
      throw new AuthorizationError("You can only view roles inside your company.");
    }

    if (!role.companyId && !tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only view roles inside your company.");
    }

    return role;
  }

  async updateRole(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    roleId: string,
    input: RoleUpdateInputDto,
  ) {
    const tenantContext = this.requireContext(context);

    this.authorizationService.ensurePermission(
      context.permissions,
      PERMISSIONS.usersCreate,
    );

    const role = await this.roleRepository.findById(roleId);

    if (!role) {
      throw new Error("Role not found.");
    }

    if (role.isSystem) {
      throw new Error("System roles cannot be edited from this screen.");
    }

    if (
      role.companyId &&
      !tenantContext.isPlatformAdmin &&
      tenantContext.companyId !== role.companyId
    ) {
      throw new AuthorizationError("You can only update roles inside your company.");
    }

    const availablePermissions = await this.permissionRepository.listAll();
    const availableCodes = new Set(availablePermissions.map((item) => item.code));

    for (const permissionCode of input.permissionCodes) {
      if (!availableCodes.has(permissionCode)) {
        throw new Error(`Unknown permission: ${permissionCode}`);
      }
    }

    return this.roleRepository.update(roleId, input);
  }
}
