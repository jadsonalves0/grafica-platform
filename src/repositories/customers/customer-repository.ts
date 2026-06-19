import type { Customer, PrismaClient } from "@prisma/client";

export class CustomerRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(input: {
    companyId: string;
    name: string;
    isActive?: boolean;
    document?: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
    addressZipCode?: string;
    addressStreet?: string;
    addressNumber?: string;
    addressDistrict?: string;
    addressCity?: string;
    addressState?: string;
    notes?: string;
  }): Promise<Customer> {
    return this.db.customer.create({
      data: {
        companyId: input.companyId,
        name: normalizeRequired(input.name),
        isActive: input.isActive ?? true,
        document: normalizeDocument(input.document),
        email: normalizeEmpty(input.email)?.toLowerCase(),
        phone: normalizeEmpty(input.phone),
        whatsapp: normalizeEmpty(input.whatsapp),
        addressZipCode: normalizeEmpty(input.addressZipCode),
        addressStreet: normalizeEmpty(input.addressStreet),
        addressNumber: normalizeEmpty(input.addressNumber),
        addressDistrict: normalizeEmpty(input.addressDistrict),
        addressCity: normalizeEmpty(input.addressCity),
        addressState: normalizeEmpty(input.addressState),
        notes: normalizeEmpty(input.notes),
      },
    });
  }

  async listByCompany(companyId: string, search?: string, includeInactive = false) {
    return this.db.customer.findMany({
      where: {
        companyId,
        ...(includeInactive ? {} : { isActive: true }),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { document: { contains: search, mode: "insensitive" } },
                { whatsapp: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });
  }

  async findById(companyId: string, customerId: string) {
    return this.db.customer.findFirst({
      where: {
        id: customerId,
        companyId,
      },
    });
  }

  async findByEmail(companyId: string, email: string) {
    return this.db.customer.findFirst({
      where: {
        companyId,
        email: email.toLowerCase(),
      },
    });
  }

  async findByDocument(companyId: string, document: string) {
    return this.db.customer.findFirst({
      where: {
        companyId,
        document: normalizeDocument(document),
      },
    });
  }

  async findByEmailExcludingId(companyId: string, email: string, customerId: string) {
    return this.db.customer.findFirst({
      where: {
        companyId,
        email: email.toLowerCase(),
        id: {
          not: customerId,
        },
      },
    });
  }

  async findByDocumentExcludingId(companyId: string, document: string, customerId: string) {
    return this.db.customer.findFirst({
      where: {
        companyId,
        document: normalizeDocument(document),
        id: {
          not: customerId,
        },
      },
    });
  }

  async update(
    companyId: string,
    customerId: string,
    input: {
      name: string;
      isActive?: boolean;
      document?: string;
      email?: string;
      phone?: string;
      whatsapp?: string;
      addressZipCode?: string;
      addressStreet?: string;
      addressNumber?: string;
      addressDistrict?: string;
      addressCity?: string;
      addressState?: string;
      notes?: string;
    },
  ) {
    return this.db.customer.update({
      where: {
        id: customerId,
      },
      data: {
        name: normalizeRequired(input.name),
        isActive: input.isActive,
        document: normalizeDocument(input.document),
        email: normalizeEmpty(input.email)?.toLowerCase(),
        phone: normalizeEmpty(input.phone),
        whatsapp: normalizeEmpty(input.whatsapp),
        addressZipCode: normalizeEmpty(input.addressZipCode),
        addressStreet: normalizeEmpty(input.addressStreet),
        addressNumber: normalizeEmpty(input.addressNumber),
        addressDistrict: normalizeEmpty(input.addressDistrict),
        addressCity: normalizeEmpty(input.addressCity),
        addressState: normalizeEmpty(input.addressState),
        notes: normalizeEmpty(input.notes),
      },
    });
  }

  async delete(companyId: string, customerId: string) {
    return this.db.customer.delete({
      where: {
        id: customerId,
      },
    });
  }

  async getDependencySummary(companyId: string, customerId: string) {
    const [quotes, orders, financialEntries] = await Promise.all([
      this.db.quote.count({
        where: {
          companyId,
          customerId,
        },
      }),
      this.db.order.count({
        where: {
          companyId,
          customerId,
        },
      }),
      this.db.financialEntry.count({
        where: {
          companyId,
          customerId,
        },
      }),
    ]);

    return {
      quotes,
      orders,
      financialEntries,
    };
  }

  async updateStatus(companyId: string, customerId: string, isActive: boolean) {
    return this.db.customer.update({
      where: {
        id: customerId,
      },
      data: {
        isActive,
      },
    });
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
