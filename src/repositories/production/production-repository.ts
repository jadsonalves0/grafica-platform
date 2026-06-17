import type { PrismaClient } from "@prisma/client";

export class ProductionRepository {
  constructor(private readonly db: PrismaClient) {}

  async findRecipeProductById(companyId: string, productId: string) {
    return this.db.product.findFirst({
      where: {
        id: productId,
        companyId,
        type: "FINISHED_PRODUCT",
      },
      include: {
        recipeItems: {
          include: {
            materialProduct: true,
          },
          orderBy: {
            materialProduct: {
              name: "asc",
            },
          },
        },
      },
    });
  }

  async replaceRecipe(
    companyId: string,
    productId: string,
    items: Array<{
      materialProductId: string;
      quantityPerUnit: number;
      lossPercent: number;
      notes?: string;
    }>,
  ) {
    return this.db.$transaction(async (tx) => {
      await tx.productRecipeItem.deleteMany({
        where: {
          companyId,
          productId,
        },
      });

      if (items.length) {
        await tx.productRecipeItem.createMany({
          data: items.map((item) => ({
            companyId,
            productId,
            materialProductId: item.materialProductId,
            quantityPerUnit: item.quantityPerUnit,
            lossPercent: item.lossPercent,
            notes: normalizeEmpty(item.notes),
          })),
        });
      }

      return tx.product.findFirst({
        where: {
          id: productId,
          companyId,
        },
        include: {
          recipeItems: {
            include: {
              materialProduct: true,
            },
            orderBy: {
              materialProduct: {
                name: "asc",
              },
            },
          },
        },
      });
    });
  }

  async listProductionRecords(companyId: string, productId?: string) {
    return this.db.productionRecord.findMany({
      where: {
        companyId,
        ...(productId ? { productId } : {}),
      },
      include: {
        product: true,
        producedByUser: true,
        consumptions: {
          include: {
            materialProduct: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async createProductionRecord(input: {
    companyId: string;
    productId: string;
    quantityProduced: number;
    totalCost: number;
    unitCost: number;
    notes?: string;
    producedByUserId?: string;
    consumptions: Array<{
      materialProductId: string;
      quantityConsumed: number;
      unitCost: number;
      totalCost: number;
    }>;
  }) {
    return this.db.$transaction(async (tx) => {
      const record = await tx.productionRecord.create({
        data: {
          companyId: input.companyId,
          productId: input.productId,
          quantityProduced: input.quantityProduced,
          totalCost: input.totalCost,
          unitCost: input.unitCost,
          notes: normalizeEmpty(input.notes),
          producedByUserId: input.producedByUserId,
          consumptions: {
            create: input.consumptions.map((item) => ({
              materialProductId: item.materialProductId,
              quantityConsumed: item.quantityConsumed,
              unitCost: item.unitCost,
              totalCost: item.totalCost,
            })),
          },
        },
      });

      for (const consumption of input.consumptions) {
        await tx.product.update({
          where: {
            id: consumption.materialProductId,
          },
          data: {
            currentStock: {
              decrement: consumption.quantityConsumed,
            },
          },
        });

        await tx.stockMovement.create({
          data: {
            companyId: input.companyId,
            productId: consumption.materialProductId,
            movementType: "OUTPUT",
            quantity: consumption.quantityConsumed,
            unitCost: consumption.unitCost,
            referenceType: "MANUAL",
            referenceId: `PROD-${record.id}`,
            notes: "Consumo automatico de materia-prima na producao",
            createdByUserId: input.producedByUserId,
          },
        });
      }

      await tx.product.update({
        where: {
          id: input.productId,
        },
        data: {
          currentStock: {
            increment: input.quantityProduced,
          },
          costPrice: input.unitCost,
        },
      });

      await tx.stockMovement.create({
        data: {
          companyId: input.companyId,
          productId: input.productId,
          movementType: "INPUT",
          quantity: input.quantityProduced,
          unitCost: input.unitCost,
          referenceType: "MANUAL",
          referenceId: `PROD-${record.id}`,
          notes: "Entrada automatica do produto acabado apos producao",
          createdByUserId: input.producedByUserId,
        },
      });

      return tx.productionRecord.findUnique({
        where: {
          id: record.id,
        },
        include: {
          product: true,
          producedByUser: true,
          consumptions: {
            include: {
              materialProduct: true,
            },
          },
        },
      });
    });
  }
}

function normalizeEmpty(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
