import type { PrismaClient } from "@prisma/client";

export class CompanyUserRepository {
  constructor(private readonly db: PrismaClient) {}

  async findActiveMembership(userId: string, companySlug: string) {
    return this.db.companyUser.findFirst({
      where: {
        userId,
        isActive: true,
        company: {
          slug: companySlug,
          status: "ACTIVE",
        },
      },
      include: {
        company: true,
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async findActiveMembershipByCompanyId(userId: string, companyId: string) {
    return this.db.companyUser.findFirst({
      where: {
        userId,
        companyId,
        isActive: true,
        company: {
          status: "ACTIVE",
        },
      },
      include: {
        company: true,
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }
}
