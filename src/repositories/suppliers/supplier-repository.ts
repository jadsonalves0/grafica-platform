import type { PrismaClient, Supplier } from "@prisma/client";

export class SupplierRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(input: {
    companyId: string;
    legalName: string;
    tradeName?: string;
    document?: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
    contactName?: string;
    addressZipCode?: string;
    addressStreet?: string;
    addressNumber?: string;
    addressDistrict?: string;
    addressCity?: string;
    addressState?: string;
    notes?: string;
    isActive?: boolean;
  }): Promise<Supplier> {
    return this.db.supplier.create({
      data: {
        companyId: input.companyId,
        legalName: normalizeRequired(input.legalName),
        tradeName: normalizeEmpty(input.tradeName),
        document: normalizeDocument(input.document),
        email: normalizeEmpty(input.email)?.toLowerCase(),
        phone: normalizeEmpty(input.phone),
        whatsapp: normalizeEmpty(input.whatsapp),
        contactName: normalizeEmpty(input.contactName),
        addressZipCode: normalizeEmpty(input.addressZipCode),
        addressStreet: normalizeEmpty(input.addressStreet),
        addressNumber: normalizeEmpty(input.addressNumber),
        addressDistrict: normalizeEmpty(input.addressDistrict),
        addressCity: normalizeEmpty(input.addressCity),
        addressState: normalizeEmpty(input.addressState),
        notes: normalizeEmpty(input.notes),
        isActive: input.isActive ?? true,
      },
    });
  }

  async listByCompany(companyId: string, search?: string, includeInactive = false) {
    return this.db.supplier.findMany({
      where: {
        companyId,
        ...(includeInactive ? {} : { isActive: true }),
        ...(search
          ? {
              OR: [
                { legalName: { contains: search, mode: "insensitive" } },
                { tradeName: { contains: search, mode: "insensitive" } },
                { document: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { phone: { contains: search, mode: "insensitive" } },
                { whatsapp: { contains: search, mode: "insensitive" } },
                { contactName: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ isActive: "desc" }, { tradeName: "asc" }, { legalName: "asc" }],
    });
  }

  async findById(companyId: string, supplierId: string) {
    return this.db.supplier.findFirst({
      where: {
        id: supplierId,
        companyId,
      },
    });
  }

  async findByDocument(companyId: string, document: string) {
    return this.db.supplier.findFirst({
      where: {
        companyId,
        document: normalizeDocument(document),
      },
    });
  }

  async findByDocumentExcludingId(companyId: string, document: string, supplierId: string) {
    return this.db.supplier.findFirst({
      where: {
        companyId,
        document: normalizeDocument(document),
        id: {
          not: supplierId,
        },
      },
    });
  }

  async findByName(companyId: string, name: string) {
    const normalized = normalizeRequired(name);
    return this.db.supplier.findFirst({
      where: {
        companyId,
        OR: [
          { legalName: { equals: normalized, mode: "insensitive" } },
          { tradeName: { equals: normalized, mode: "insensitive" } },
        ],
      },
      orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
    });
  }

  async findByDocumentOrName(companyId: string, input: { document?: string | null; name?: string | null }) {
    const normalizedDocument = normalizeDocument(input.document ?? undefined);
    if (normalizedDocument) {
      const byDocument = await this.findByDocument(companyId, normalizedDocument);
      if (byDocument) {
        return byDocument;
      }
    }

    const normalizedName = normalizeEmpty(input.name ?? undefined);
    if (normalizedName) {
      return this.findByName(companyId, normalizedName);
    }

    return null;
  }

  async update(
    companyId: string,
    supplierId: string,
    input: {
      legalName: string;
      tradeName?: string;
      document?: string;
      email?: string;
      phone?: string;
      whatsapp?: string;
      contactName?: string;
      addressZipCode?: string;
      addressStreet?: string;
      addressNumber?: string;
      addressDistrict?: string;
      addressCity?: string;
      addressState?: string;
      notes?: string;
      isActive?: boolean;
    },
  ) {
    return this.db.supplier.update({
      where: {
        id: supplierId,
      },
      data: {
        legalName: normalizeRequired(input.legalName),
        tradeName: normalizeEmpty(input.tradeName),
        document: normalizeDocument(input.document),
        email: normalizeEmpty(input.email)?.toLowerCase(),
        phone: normalizeEmpty(input.phone),
        whatsapp: normalizeEmpty(input.whatsapp),
        contactName: normalizeEmpty(input.contactName),
        addressZipCode: normalizeEmpty(input.addressZipCode),
        addressStreet: normalizeEmpty(input.addressStreet),
        addressNumber: normalizeEmpty(input.addressNumber),
        addressDistrict: normalizeEmpty(input.addressDistrict),
        addressCity: normalizeEmpty(input.addressCity),
        addressState: normalizeEmpty(input.addressState),
        notes: normalizeEmpty(input.notes),
        isActive: input.isActive,
      },
    });
  }

  async updateStatus(companyId: string, supplierId: string, isActive: boolean) {
    return this.db.supplier.update({
      where: {
        id: supplierId,
      },
      data: {
        isActive,
      },
    });
  }

  async delete(companyId: string, supplierId: string) {
    return this.db.supplier.delete({
      where: {
        id: supplierId,
      },
    });
  }

  async getDependencySummary(companyId: string, supplierId: string) {
    const [inventoryEntries, supplierItemMappings] = await Promise.all([
      this.db.inventoryEntry.count({
        where: {
          companyId,
          supplierId,
        },
      }),
      this.db.supplierItemMapping.count({
        where: {
          companyId,
          supplierId,
        },
      }),
    ]);

    return {
      inventoryEntries,
      supplierItemMappings,
    };
  }
}

function normalizeRequired(value: string) {
  return value.trim();
}

function normalizeEmpty(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeDocument(value?: string) {
  const trimmed = normalizeEmpty(value);
  if (!trimmed) {
    return undefined;
  }

  const normalized = trimmed.replace(/[^0-9a-zA-Z]/g, "");
  return normalized || undefined;
}
