import type { PrismaClient } from "@prisma/client";

export class RoleRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByIds(roleIds: string[]) {
    return this.db.role.findMany({
      where: {
        id: {
          in: roleIds,
        },
      },
    });
  }

  async create(input: {
    companyId?: string | null;
    name: string;
    code: string;
    permissionCodes: string[];
  }) {
    return this.db.$transaction(async (tx) => {
      const permissions = await tx.permission.findMany({
        where: {
          code: {
            in: input.permissionCodes,
          },
        },
      });

      const role = await tx.role.create({
        data: {
          companyId: input.companyId ?? null,
          name: input.name,
          code: input.code,
          isSystem: false,
        },
      });

      await tx.rolePermission.createMany({
        data: permissions.map((permission) => ({
          roleId: role.id,
          permissionId: permission.id,
        })),
      });

      return tx.role.findUnique({
        where: { id: role.id },
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      });
    });
  }

  async listByCompany(companyId: string) {
    return this.db.role.findMany({
      where: {
        OR: [{ companyId }, { companyId: null }],
      },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    });
  }

  async findById(roleId: string) {
    return this.db.role.findUnique({
      where: {
        id: roleId,
      },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  async update(
    roleId: string,
    input: {
      name: string;
      permissionCodes: string[];
    },
  ) {
    return this.db.$transaction(async (tx) => {
      const permissions = await tx.permission.findMany({
        where: {
          code: {
            in: input.permissionCodes,
          },
        },
      });

      await tx.role.update({
        where: { id: roleId },
        data: {
          name: input.name,
        },
      });

      await tx.rolePermission.deleteMany({
        where: {
          roleId,
        },
      });

      await tx.rolePermission.createMany({
        data: permissions.map((permission) => ({
          roleId,
          permissionId: permission.id,
        })),
      });

      return tx.role.findUnique({
        where: { id: roleId },
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      });
    });
  }
}
