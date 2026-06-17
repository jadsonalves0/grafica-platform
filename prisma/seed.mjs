import { randomBytes, scryptSync } from "crypto";

import { PrismaClient, CompanyStatus, UserStatus } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = "Trocar123!";

const permissions = [
  { module: "companies", action: "view", code: "companies.view", description: "Visualizar empresas" },
  { module: "companies", action: "create", code: "companies.create", description: "Criar empresas" },
  { module: "companies", action: "update", code: "companies.update", description: "Editar empresas" },
  { module: "users", action: "view", code: "users.view", description: "Visualizar usuarios" },
  { module: "users", action: "create", code: "users.create", description: "Criar usuarios" },
  { module: "customers", action: "view", code: "customers.view", description: "Visualizar clientes" },
  { module: "customers", action: "create", code: "customers.create", description: "Criar clientes" },
  { module: "customers", action: "update", code: "customers.update", description: "Editar clientes" },
  { module: "customers", action: "delete", code: "customers.delete", description: "Excluir clientes" },
  { module: "inventory", action: "view", code: "inventory.view", description: "Visualizar estoque" },
  { module: "inventory", action: "create", code: "inventory.create", description: "Criar itens de estoque" },
  { module: "inventory", action: "update", code: "inventory.update", description: "Movimentar estoque" },
  { module: "quotes", action: "view", code: "quotes.view", description: "Visualizar orcamentos" },
  { module: "quotes", action: "create", code: "quotes.create", description: "Criar orcamentos" },
  { module: "quotes", action: "update", code: "quotes.update", description: "Editar orcamentos" },
  { module: "quotes", action: "delete", code: "quotes.delete", description: "Excluir orcamentos" },
  { module: "quotes", action: "approve", code: "quotes.approve", description: "Aprovar orcamentos" },
  { module: "orders", action: "view", code: "orders.view", description: "Visualizar pedidos" },
  { module: "orders", action: "create", code: "orders.create", description: "Criar pedidos" },
  { module: "orders", action: "update", code: "orders.update", description: "Editar pedidos" },
  { module: "orders", action: "manage_status", code: "orders.manage_status", description: "Gerenciar status dos pedidos" },
  { module: "financial", action: "view", code: "financial.view", description: "Visualizar financeiro" },
  { module: "financial", action: "manage", code: "financial.manage", description: "Gerenciar financeiro" },
  { module: "site", action: "view", code: "site.view", description: "Visualizar site" },
  { module: "site", action: "update", code: "site.update", description: "Editar site" },
];

const systemRoles = [
  {
    name: "Administrador da Plataforma",
    code: "platform_admin",
    isSystem: true,
    permissionCodes: permissions.map((permission) => permission.code),
  },
  {
    name: "Administrador da Grafica",
    code: "company_admin",
    isSystem: true,
    permissionCodes: permissions
      .filter((permission) => permission.code !== "companies.create")
      .map((permission) => permission.code),
  },
  {
    name: "Comercial",
    code: "sales",
    isSystem: true,
    permissionCodes: [
      "customers.view",
      "customers.create",
      "quotes.view",
      "quotes.create",
      "site.view",
    ],
  },
  {
    name: "Financeiro",
    code: "financial",
    isSystem: true,
    permissionCodes: [
      "customers.view",
      "financial.view",
      "financial.manage",
      "quotes.view",
    ],
  },
  {
    name: "Estoque",
    code: "inventory",
    isSystem: true,
    permissionCodes: [
      "inventory.view",
      "inventory.create",
      "inventory.update",
      "customers.view",
    ],
  },
  {
    name: "Producao",
    code: "production",
    isSystem: true,
    permissionCodes: [
      "quotes.view",
      "inventory.view",
      "site.view",
    ],
  },
];

function hashPassword(rawPassword) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(rawPassword, salt, 64);

  return `scrypt$${salt}$${derivedKey.toString("hex")}`;
}

async function upsertPermissions() {
  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: {
        module: permission.module,
        action: permission.action,
        description: permission.description,
      },
      create: permission,
    });
  }
}

async function upsertSystemRoles() {
  const permissionMap = new Map(
    (await prisma.permission.findMany()).map((permission) => [permission.code, permission.id]),
  );

  for (const role of systemRoles) {
    const existingRole = await prisma.role.findFirst({
      where: {
        companyId: null,
        code: role.code,
      },
    });

    const savedRole = existingRole
      ? await prisma.role.update({
          where: { id: existingRole.id },
          data: {
            name: role.name,
            isSystem: role.isSystem,
          },
        })
      : await prisma.role.create({
          data: {
            companyId: null,
            name: role.name,
            code: role.code,
            isSystem: role.isSystem,
          },
        });

    await prisma.rolePermission.deleteMany({
      where: {
        roleId: savedRole.id,
      },
    });

    await prisma.rolePermission.createMany({
      data: role.permissionCodes.map((permissionCode) => ({
        roleId: savedRole.id,
        permissionId: permissionMap.get(permissionCode),
      })),
      skipDuplicates: true,
    });
  }
}

async function upsertPilotCompany() {
  const company = await prisma.company.upsert({
    where: { slug: "ponto-print" },
    update: {
      legalName: "Grafica Ponto Print Ltda",
      tradeName: "Ponto Print",
      email: "contato@pontoprint.local",
      phone: "(00) 0000-0000",
      whatsapp: "(00) 00000-0000",
      status: CompanyStatus.ACTIVE,
    },
    create: {
      legalName: "Grafica Ponto Print Ltda",
      tradeName: "Ponto Print",
      slug: "ponto-print",
      document: "00.000.000/0001-00",
      email: "contato@pontoprint.local",
      phone: "(00) 0000-0000",
      whatsapp: "(00) 00000-0000",
      status: CompanyStatus.ACTIVE,
    },
  });

  await prisma.siteSetting.upsert({
    where: { companyId: company.id },
    update: {
      primaryColor: "#b5421f",
      secondaryColor: "#d8c2a8",
      accentColor: "#2b6e52",
      heroTitle: "Ponto Print",
      heroSubtitle: "Grafica rapida piloto da plataforma",
      aboutText: "Empresa piloto para validacao da plataforma multiempresa.",
      contactEmail: "contato@pontoprint.local",
      contactPhone: "(00) 0000-0000",
      contactWhatsapp: "(00) 00000-0000",
      isSitePublished: false,
    },
    create: {
      companyId: company.id,
      primaryColor: "#b5421f",
      secondaryColor: "#d8c2a8",
      accentColor: "#2b6e52",
      heroTitle: "Ponto Print",
      heroSubtitle: "Grafica rapida piloto da plataforma",
      aboutText: "Empresa piloto para validacao da plataforma multiempresa.",
      contactEmail: "contato@pontoprint.local",
      contactPhone: "(00) 0000-0000",
      contactWhatsapp: "(00) 00000-0000",
      isSitePublished: false,
    },
  });

  return company;
}

async function upsertPilotAdmin(companyId) {
  const user = await prisma.user.upsert({
    where: { email: "admin@pontoprint.local" },
    update: {
      name: "Administrador Ponto Print",
      passwordHash: hashPassword(DEFAULT_PASSWORD),
      status: UserStatus.ACTIVE,
      isPlatformAdmin: false,
    },
    create: {
      name: "Administrador Ponto Print",
      email: "admin@pontoprint.local",
      passwordHash: hashPassword(DEFAULT_PASSWORD),
      status: UserStatus.ACTIVE,
      isPlatformAdmin: false,
    },
  });

  const membership = await prisma.companyUser.upsert({
    where: {
      companyId_userId: {
        companyId,
        userId: user.id,
      },
    },
    update: {
      isActive: true,
    },
    create: {
      companyId,
      userId: user.id,
      isActive: true,
    },
  });

  const companyAdminRole = await prisma.role.findFirstOrThrow({
    where: {
      companyId: null,
      code: "company_admin",
    },
  });

  await prisma.companyUserRole.upsert({
    where: {
      companyUserId_roleId: {
        companyUserId: membership.id,
        roleId: companyAdminRole.id,
      },
    },
    update: {},
    create: {
      companyUserId: membership.id,
      roleId: companyAdminRole.id,
    },
  });
}

async function upsertPlatformAdmin() {
  const user = await prisma.user.upsert({
    where: { email: "platform.admin@graficaplatform.local" },
    update: {
      name: "Administrador da Plataforma",
      passwordHash: hashPassword(DEFAULT_PASSWORD),
      status: UserStatus.ACTIVE,
      isPlatformAdmin: true,
    },
    create: {
      name: "Administrador da Plataforma",
      email: "platform.admin@graficaplatform.local",
      passwordHash: hashPassword(DEFAULT_PASSWORD),
      status: UserStatus.ACTIVE,
      isPlatformAdmin: true,
    },
  });

  const platformAdminRole = await prisma.role.findFirstOrThrow({
    where: {
      companyId: null,
      code: "platform_admin",
    },
  });

  const platformCompany = await prisma.company.upsert({
    where: { slug: "graficaplatform-core" },
    update: {
      legalName: "Grafica Platform Operacoes",
      tradeName: "Grafica Platform",
      status: CompanyStatus.ACTIVE,
    },
    create: {
      legalName: "Grafica Platform Operacoes",
      tradeName: "Grafica Platform",
      slug: "graficaplatform-core",
      email: "operacao@graficaplatform.local",
      status: CompanyStatus.ACTIVE,
    },
  });

  const membership = await prisma.companyUser.upsert({
    where: {
      companyId_userId: {
        companyId: platformCompany.id,
        userId: user.id,
      },
    },
    update: {
      isActive: true,
    },
    create: {
      companyId: platformCompany.id,
      userId: user.id,
      isActive: true,
    },
  });

  await prisma.companyUserRole.upsert({
    where: {
      companyUserId_roleId: {
        companyUserId: membership.id,
        roleId: platformAdminRole.id,
      },
    },
    update: {},
    create: {
      companyUserId: membership.id,
      roleId: platformAdminRole.id,
    },
  });
}

async function main() {
  await upsertPermissions();
  await upsertSystemRoles();
  const pilotCompany = await upsertPilotCompany();
  await upsertPilotAdmin(pilotCompany.id);
  await upsertPlatformAdmin();

  console.log("Seed concluido com sucesso.");
  console.log("Empresa piloto: ponto-print");
  console.log("Usuario piloto: admin@pontoprint.local");
  console.log("Usuario plataforma: platform.admin@graficaplatform.local");
  console.log(`Senha inicial provisoria: ${DEFAULT_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error("Erro ao executar seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
