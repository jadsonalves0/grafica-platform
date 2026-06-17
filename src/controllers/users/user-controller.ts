import { BaseController, type ControllerResult } from "@/controllers/base/base-controller";
import { formatPhone } from "@/lib/forms/br-utils";
import type { UserCreateInputDto } from "@/models/dto/user-create-input";
import type { UserDetailDto } from "@/models/dto/user-detail";
import type { UserListItemDto } from "@/models/dto/user-list-item";
import type { UserUpdateInputDto } from "@/models/dto/user-update-input";
import { createUserSchema, updateUserSchema } from "@/models/validators/user-validator";
import { UserManagementService } from "@/services/users/user-management-service";

type UserContext = {
  companyId: string;
  userId: string;
  isPlatformAdmin: boolean;
  permissions: string[];
};

export class UserController extends BaseController {
  constructor(private readonly userService: UserManagementService) {
    super();
  }

  async create(
    context: UserContext,
    input: UserCreateInputDto,
  ): Promise<ControllerResult<{ id: string; email: string; name: string }>> {
    try {
      const payload = createUserSchema.parse(input);
      const user = await this.userService.createUser(context, payload);

      return this.ok({
        id: user.id,
        email: user.email,
        name: user.name,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async list(
    context: UserContext,
    companyId: string,
  ): Promise<ControllerResult<UserListItemDto[]>> {
    try {
      const memberships = await this.userService.listUsers(context, companyId);

      return this.ok(
        memberships.map((membership) => ({
          id: membership.user.id,
          name: membership.user.name,
          email: membership.user.email,
          phone: membership.user.phone ? formatPhone(membership.user.phone) : null,
          status: membership.user.status,
          isPlatformAdmin: membership.user.isPlatformAdmin,
          roles: membership.userRoles.map((userRole) => ({
            id: userRole.role.id,
            name: userRole.role.name,
            code: userRole.role.code,
          })),
        })),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async show(
    context: UserContext,
    companyId: string,
    userId: string,
  ): Promise<ControllerResult<UserDetailDto>> {
    try {
      const membership = await this.userService.getUser(context, companyId, userId);
      return this.ok(mapUserDetail(membership));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }

  async update(
    context: UserContext,
    companyId: string,
    userId: string,
    input: UserUpdateInputDto,
  ): Promise<ControllerResult<UserDetailDto>> {
    try {
      const payload = updateUserSchema.parse(input);
      const membership = await this.userService.updateUser(context, companyId, userId, payload);
      return this.ok(mapUserDetail(membership));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return this.fail(message);
    }
  }
}

function mapUserDetail(membership: {
  companyId: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    status: string;
    isPlatformAdmin: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  userRoles: Array<{
    role: {
      id: string;
      name: string;
      code: string;
    };
  }>;
}): UserDetailDto {
  return {
    id: membership.user.id,
    companyId: membership.companyId,
    name: membership.user.name,
    email: membership.user.email,
    phone: membership.user.phone ? formatPhone(membership.user.phone) : null,
    status: membership.user.status,
    isPlatformAdmin: membership.user.isPlatformAdmin,
    roles: membership.userRoles.map((userRole) => ({
      id: userRole.role.id,
      name: userRole.role.name,
      code: userRole.role.code,
    })),
    createdAt: membership.user.createdAt.toISOString(),
    updatedAt: membership.user.updatedAt.toISOString(),
  };
}
