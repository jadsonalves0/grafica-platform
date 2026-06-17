import type { PrismaClient, User, UserStatus } from "@prisma/client";

export class UserManagementRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.db.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async createWithMembership(input: {
    companyId: string;
    name: string;
    email: string;
    phone?: string;
    passwordHash: string;
    isPlatformAdmin?: boolean;
    status?: UserStatus;
    roleIds: string[];
  }) {
    return this.db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: input.name,
          email: input.email.toLowerCase(),
          phone: input.phone,
          passwordHash: input.passwordHash,
          isPlatformAdmin: input.isPlatformAdmin ?? false,
          status: input.status ?? "INVITED",
        },
      });

      const membership = await tx.companyUser.create({
        data: {
          companyId: input.companyId,
          userId: user.id,
          isActive: true,
        },
      });

      if (input.roleIds.length > 0) {
        await tx.companyUserRole.createMany({
          data: input.roleIds.map((roleId) => ({
            companyUserId: membership.id,
            roleId,
          })),
        });
      }

      return user;
    });
  }

  async listByCompany(companyId: string) {
    return this.db.companyUser.findMany({
      where: {
        companyId,
        isActive: true,
      },
      include: {
        user: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
      orderBy: {
        user: {
          name: "asc",
        },
      },
    });
  }

  async findMembershipByUserId(companyId: string, userId: string) {
    return this.db.companyUser.findFirst({
      where: {
        companyId,
        userId,
        isActive: true,
      },
      include: {
        user: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  async updateMembership(input: {
    companyId: string;
    userId: string;
    name: string;
    phone?: string;
    status: UserStatus;
    isPlatformAdmin?: boolean;
    roleIds: string[];
  }) {
    return this.db.$transaction(async (tx) => {
      const membership = await tx.companyUser.findFirst({
        where: {
          companyId: input.companyId,
          userId: input.userId,
          isActive: true,
        },
      });

      if (!membership) {
        throw new Error("User membership not found.");
      }

      await tx.user.update({
        where: {
          id: input.userId,
        },
        data: {
          name: input.name,
          phone: input.phone?.trim() || null,
          status: input.status,
          ...(input.isPlatformAdmin !== undefined
            ? { isPlatformAdmin: input.isPlatformAdmin }
            : {}),
        },
      });

      await tx.companyUserRole.deleteMany({
        where: {
          companyUserId: membership.id,
        },
      });

      if (input.roleIds.length > 0) {
        await tx.companyUserRole.createMany({
          data: input.roleIds.map((roleId) => ({
            companyUserId: membership.id,
            roleId,
          })),
        });
      }

      const updatedMembership = await tx.companyUser.findFirst({
        where: {
          id: membership.id,
        },
        include: {
          user: true,
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });

      if (!updatedMembership) {
        throw new Error("User membership not found after update.");
      }

      return updatedMembership;
    });
  }
}
