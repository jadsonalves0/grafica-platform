import { AuthorizationError } from "@/lib/auth/auth-errors";
import type { PasswordHasher } from "@/lib/auth/password-hasher";
import { PERMISSIONS } from "@/lib/permissions/permission-types";
import type { TenantContext } from "@/lib/tenant/tenant-context";
import type { UserCreateInputDto } from "@/models/dto/user-create-input";
import type { UserUpdateInputDto } from "@/models/dto/user-update-input";
import { RoleRepository } from "@/repositories/roles/role-repository";
import { UserManagementRepository } from "@/repositories/users/user-management-repository";
import { AuthorizationService } from "@/services/auth/authorization-service";
import { BaseService } from "@/services/base/base-service";

export class UserManagementService extends BaseService {
  constructor(
    private readonly userRepository: UserManagementRepository,
    private readonly roleRepository: RoleRepository,
    private readonly authorizationService: AuthorizationService,
    private readonly passwordHasher: PasswordHasher,
  ) {
    super();
  }

  async createUser(
    context: TenantContext & { permissions: string[] },
    input: UserCreateInputDto,
  ) {
    const tenantContext = this.requireContext(context);

    this.authorizationService.ensurePermission(
      context.permissions,
      PERMISSIONS.usersCreate,
    );

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== input.companyId) {
      throw new AuthorizationError("You can only create users inside your company.");
    }

    const existingUser = await this.userRepository.findByEmail(input.email);

    if (existingUser) {
      throw new Error("A user with this email already exists.");
    }

    const roles = await this.roleRepository.findByIds(input.roleIds);

    if (roles.length !== input.roleIds.length) {
      throw new Error("One or more selected roles were not found.");
    }

    for (const role of roles) {
      if (role.companyId && role.companyId !== input.companyId) {
        throw new Error("A selected role belongs to a different company.");
      }
    }

    const passwordHash = await this.passwordHasher.hash(input.password);

    return this.userRepository.createWithMembership({
      ...input,
      passwordHash,
      status: "INVITED",
    });
  }

  async listUsers(context: TenantContext & { permissions: string[] }, companyId: string) {
    const tenantContext = this.requireContext(context);

    this.authorizationService.ensurePermission(
      context.permissions,
      PERMISSIONS.usersView,
    );

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only list users inside your company.");
    }

    return this.userRepository.listByCompany(companyId);
  }

  async getUser(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    userId: string,
  ) {
    const tenantContext = this.requireContext(context);

    this.authorizationService.ensurePermission(
      context.permissions,
      PERMISSIONS.usersView,
    );

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only view users inside your company.");
    }

    const membership = await this.userRepository.findMembershipByUserId(companyId, userId);

    if (!membership) {
      throw new Error("User not found.");
    }

    return membership;
  }

  async updateUser(
    context: TenantContext & { permissions: string[] },
    companyId: string,
    userId: string,
    input: UserUpdateInputDto,
  ) {
    const tenantContext = this.requireContext(context);

    this.authorizationService.ensurePermission(
      context.permissions,
      PERMISSIONS.usersCreate,
    );

    if (!tenantContext.isPlatformAdmin && tenantContext.companyId !== companyId) {
      throw new AuthorizationError("You can only update users inside your company.");
    }

    const existingMembership = await this.userRepository.findMembershipByUserId(companyId, userId);

    if (!existingMembership) {
      throw new Error("User not found.");
    }

    const roles = await this.roleRepository.findByIds(input.roleIds);

    if (roles.length !== input.roleIds.length) {
      throw new Error("One or more selected roles were not found.");
    }

    for (const role of roles) {
      if (role.companyId && role.companyId !== companyId) {
        throw new Error("A selected role belongs to a different company.");
      }
    }

    return this.userRepository.updateMembership({
      companyId,
      userId,
      name: input.name,
      phone: input.phone,
      status: input.status,
      isPlatformAdmin: input.isPlatformAdmin,
      roleIds: input.roleIds,
    });
  }
}
