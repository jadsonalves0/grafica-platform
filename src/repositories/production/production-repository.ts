import type { PrismaClient } from "@prisma/client";

import {
  registerInputStock,
  registerOutputStockByFifo,
  roundCurrency,
  roundQuantity,
} from "@/repositories/inventory/stock-ledger";

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
        responsibleUser: true,
        order: true,
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
    orderId?: string;
    quantityPlanned?: number;
    quantityProduced: number;
    lossQuantity?: number;
    notes?: string;
    producedByUserId?: string;
    responsibleUserId?: string;
    consumptions: Array<{
      materialProductId: string;
      quantityConsumed: number;
    }>;
  }) {
    return this.db.$transaction(async (tx) => {
      const record = await tx.productionRecord.create({
        data: {
          companyId: input.companyId,
          productId: input.productId,
          orderId: input.orderId,
          quantityPlanned: input.quantityPlanned ?? input.quantityProduced,
          quantityProduced: input.quantityProduced,
          lossQuantity: input.lossQuantity ?? 0,
          totalCost: 0,
          unitCost: 0,
          status: "IN_PRODUCTION",
          notes: normalizeEmpty(input.notes),
          producedByUserId: input.producedByUserId,
          responsibleUserId: input.responsibleUserId ?? input.producedByUserId,
        },
      });

      const consumptionRows: Array<{
        materialProductId: string;
        quantityConsumed: number;
        unitCost: number;
        totalCost: number;
      }> = [];

      let totalCost = 0;

      for (const consumption of input.consumptions) {
        const stockResult = await registerOutputStockByFifo(tx, {
          companyId: input.companyId,
          productId: consumption.materialProductId,
          quantity: consumption.quantityConsumed,
          reasonCode: "PRODUCTION_CONSUMPTION",
          reasonText: "Consumo automatico de materia-prima",
          referenceType: "PRODUCTION",
          referenceId: `PROD-${record.id}`,
          productionRecordId: record.id,
          notes: "Consumo automatico de materia-prima na producao",
          createdByUserId: input.producedByUserId,
        });

        totalCost = roundCurrency(totalCost + stockResult.totalCost);
        consumptionRows.push({
          materialProductId: consumption.materialProductId,
          quantityConsumed: roundQuantity(consumption.quantityConsumed),
          unitCost: stockResult.unitCost,
          totalCost: stockResult.totalCost,
        });
      }

      if (consumptionRows.length) {
        await tx.productionConsumption.createMany({
          data: consumptionRows.map((item) => ({
            productionRecordId: record.id,
            materialProductId: item.materialProductId,
            quantityConsumed: item.quantityConsumed,
            unitCost: item.unitCost,
            totalCost: item.totalCost,
          })),
        });
      }

      const unitCost =
        input.quantityProduced > 0
          ? roundCurrency(totalCost / input.quantityProduced)
          : 0;

      await registerInputStock(tx, {
        companyId: input.companyId,
        productId: input.productId,
        quantity: input.quantityProduced,
        unitCost,
        reasonCode: "PRODUCTION_OUTPUT",
        reasonText: "Entrada automatica do produto acabado apos producao",
        referenceType: "PRODUCTION",
        referenceId: `PROD-${record.id}`,
        productionRecordId: record.id,
        notes: "Entrada automatica do produto acabado apos producao",
        createdByUserId: input.producedByUserId,
        updateReferenceCost: true,
      });

      await tx.productionRecord.update({
        where: {
          id: record.id,
        },
        data: {
          totalCost,
          unitCost,
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      return tx.productionRecord.findUniqueOrThrow({
        where: {
          id: record.id,
        },
        include: {
          product: true,
          producedByUser: true,
          responsibleUser: true,
          order: true,
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
