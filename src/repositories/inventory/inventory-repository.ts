import type { PrismaClient, Product } from "@prisma/client";

export class InventoryRepository {
  constructor(private readonly db: PrismaClient) {}

  async createProduct(input: {
    companyId: string;
    categoryId?: string;
    name: string;
    sku?: string;
    barcode?: string;
    unit: string;
    type: "RAW_MATERIAL" | "SERVICE" | "FINISHED_PRODUCT";
    costPrice: number;
    salePrice: number;
    minimumStock: number;
  }): Promise<Product> {
    return this.db.product.create({
      data: {
        companyId: input.companyId,
        categoryId: input.categoryId,
        name: input.name,
        sku: normalizeEmpty(input.sku),
        barcode: normalizeEmpty(input.barcode),
        unit: input.unit,
        type: input.type,
        costPrice: input.costPrice,
        salePrice: input.salePrice,
        minimumStock: input.minimumStock,
      },
    });
  }

  async listProducts(companyId: string, search?: string) {
    return this.db.product.findMany({
      where: {
        companyId,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { sku: { contains: search, mode: "insensitive" } },
                { barcode: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: {
        name: "asc",
      },
    });
  }

  async findProductById(companyId: string, productId: string) {
    return this.db.product.findFirst({
      where: {
        id: productId,
        companyId,
      },
    });
  }

  async findProductBySku(companyId: string, sku: string) {
    return this.db.product.findFirst({
      where: {
        companyId,
        sku: normalizeEmpty(sku),
      },
    });
  }

  async findProductByBarcode(companyId: string, barcode: string) {
    return this.db.product.findFirst({
      where: {
        companyId,
        barcode: normalizeEmpty(barcode),
      },
    });
  }

  async findProductBySkuExcludingId(companyId: string, sku: string, productId: string) {
    return this.db.product.findFirst({
      where: {
        companyId,
        sku: normalizeEmpty(sku),
        id: {
          not: productId,
        },
      },
    });
  }

  async findProductByBarcodeExcludingId(companyId: string, barcode: string, productId: string) {
    return this.db.product.findFirst({
      where: {
        companyId,
        barcode: normalizeEmpty(barcode),
        id: {
          not: productId,
        },
      },
    });
  }

  async updateProduct(
    companyId: string,
    productId: string,
    input: {
      categoryId?: string;
      name: string;
      sku?: string;
      barcode?: string;
      unit: string;
      type: "RAW_MATERIAL" | "SERVICE" | "FINISHED_PRODUCT";
      costPrice: number;
      salePrice: number;
      minimumStock: number;
    },
  ): Promise<Product> {
    return this.db.product.update({
      where: {
        id: productId,
      },
      data: {
        categoryId: input.categoryId,
        name: input.name.trim(),
        sku: normalizeEmpty(input.sku),
        barcode: normalizeEmpty(input.barcode),
        unit: input.unit.trim(),
        type: input.type,
        costPrice: input.costPrice,
        salePrice: input.salePrice,
        minimumStock: input.minimumStock,
      },
    });
  }

  async createMovement(input: {
    companyId: string;
    productId: string;
    movementType: "INPUT" | "OUTPUT" | "ADJUSTMENT";
    quantity: number;
    unitCost?: number;
    referenceType?: "MANUAL" | "QUOTE" | "ORDER" | "PURCHASE";
    referenceId?: string;
    notes?: string;
    createdByUserId: string;
    newCurrentStock: number;
  }) {
    return this.db.$transaction(async (tx) => {
      const movement = await tx.stockMovement.create({
        data: {
          companyId: input.companyId,
          productId: input.productId,
          movementType: input.movementType,
          quantity: input.quantity,
          unitCost: input.unitCost,
          referenceType: input.referenceType,
          referenceId: normalizeEmpty(input.referenceId),
          notes: normalizeEmpty(input.notes),
          createdByUserId: input.createdByUserId,
        },
      });

      await tx.product.update({
        where: { id: input.productId },
        data: {
          currentStock: input.newCurrentStock,
        },
      });

      return movement;
    });
  }

  async listMovements(companyId: string, productId?: string) {
    return this.db.stockMovement.findMany({
      where: {
        companyId,
        ...(productId ? { productId } : {}),
      },
      include: {
        product: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }
}

function normalizeEmpty(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
