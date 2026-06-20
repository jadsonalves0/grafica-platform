import type { Prisma, PrismaClient, StockMovementReasonCode, StockReferenceType } from "@prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

type InputStockParams = {
  companyId: string;
  productId: string;
  quantity: number;
  unitCost: number;
  reasonCode: StockMovementReasonCode;
  reasonText?: string;
  referenceType?: StockReferenceType;
  referenceId?: string;
  inventoryEntryId?: string;
  productionRecordId?: string;
  notes?: string;
  occurredAt?: Date;
  createdByUserId?: string;
  updateReferenceCost?: boolean;
};

type OutputStockParams = {
  companyId: string;
  productId: string;
  quantity: number;
  reasonCode: StockMovementReasonCode;
  reasonText?: string;
  referenceType?: StockReferenceType;
  referenceId?: string;
  productionRecordId?: string;
  notes?: string;
  occurredAt?: Date;
  createdByUserId?: string;
  allowNegativeStock?: boolean;
};

type SpecificLayerOutputParams = Omit<OutputStockParams, "quantity"> & {
  layers: Array<{
    layerId: string;
    quantity: number;
    unitCost: number;
  }>;
};

export async function ensureOperationalSettings(tx: Tx, companyId: string) {
  return tx.companyOperationalSetting.upsert({
    where: { companyId },
    update: {},
    create: {
      companyId,
    },
  });
}

export async function registerInputStock(tx: Tx, input: InputStockParams) {
  const product = await tx.product.findFirst({
    where: {
      id: input.productId,
      companyId: input.companyId,
    },
  });

  if (!product) {
    throw new Error("Item nao encontrado para entrada em estoque.");
  }

  const quantity = roundQuantity(input.quantity);
  const unitCost = roundCurrency(input.unitCost);
  const occurredAt = input.occurredAt ?? new Date();

  const movement = await tx.stockMovement.create({
    data: {
      companyId: input.companyId,
      productId: input.productId,
      movementType: "INPUT",
      quantity,
      unitCost,
      reasonCode: input.reasonCode,
      reasonText: normalizeEmpty(input.reasonText),
      referenceType: input.referenceType,
      referenceId: normalizeEmpty(input.referenceId),
      inventoryEntryId: input.inventoryEntryId,
      productionRecordId: input.productionRecordId,
      notes: normalizeEmpty(input.notes),
      occurredAt,
      createdByUserId: input.createdByUserId,
    },
  });

  await tx.product.update({
    where: { id: input.productId },
    data: {
      currentStock: {
        increment: quantity,
      },
      ...(input.updateReferenceCost
        ? {
            costPrice: unitCost,
          }
        : {}),
    },
  });

  if (product.controlsStock) {
    await tx.stockLayer.create({
      data: {
        companyId: input.companyId,
        productId: input.productId,
        inventoryEntryId: input.inventoryEntryId,
        stockMovementId: movement.id,
        entryDate: occurredAt,
        originalQuantity: quantity,
        availableQuantity: quantity,
        unitCost,
      },
    });
  }

  return {
    movement,
    quantity,
    unitCost,
  };
}

export async function registerOutputStockByFifo(tx: Tx, input: OutputStockParams) {
  const product = await tx.product.findFirst({
    where: {
      id: input.productId,
      companyId: input.companyId,
    },
  });

  if (!product) {
    throw new Error("Item nao encontrado para saida de estoque.");
  }

  const quantity = roundQuantity(input.quantity);
  const occurredAt = input.occurredAt ?? new Date();
  const settings = await ensureOperationalSettings(tx, input.companyId);
  const effectiveAllowNegativeStock = input.allowNegativeStock ?? settings.allowNegativeStock;

  if (!product.controlsStock) {
    const movement = await tx.stockMovement.create({
      data: {
        companyId: input.companyId,
        productId: input.productId,
        movementType: "OUTPUT",
        quantity,
        unitCost: 0,
        reasonCode: input.reasonCode,
        reasonText: normalizeEmpty(input.reasonText),
        referenceType: input.referenceType,
        referenceId: normalizeEmpty(input.referenceId),
        productionRecordId: input.productionRecordId,
        notes: normalizeEmpty(input.notes),
        occurredAt,
        createdByUserId: input.createdByUserId,
      },
    });

    return {
      movement,
      quantity,
      unitCost: 0,
      totalCost: 0,
      shortageQuantity: 0,
    };
  }

  await tx.$queryRaw`
    SELECT id
    FROM products
    WHERE id = ${input.productId}
      AND company_id = ${input.companyId}
    FOR UPDATE
  `;

  await tx.$queryRaw`
    SELECT id
    FROM stock_layers
    WHERE company_id = ${input.companyId}
      AND product_id = ${input.productId}
      AND available_quantity > 0
    ORDER BY entry_date ASC, created_at ASC
    FOR UPDATE
  `;

  const layers = await tx.stockLayer.findMany({
    where: {
      companyId: input.companyId,
      productId: input.productId,
      availableQuantity: {
        gt: 0,
      },
    },
    orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }],
  });
  const availableQuantity = roundQuantity(
    layers.reduce((sum, layer) => sum + toNumber(layer.availableQuantity), 0),
  );

  let remainingQuantity = quantity;
  let totalCost = 0;
  const consumptions: Array<{
    layerId: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
  }> = [];

  for (const layer of layers) {
    if (remainingQuantity <= 0) {
      break;
    }

    const availableQuantity = toNumber(layer.availableQuantity);
    const consumeQuantity = roundQuantity(Math.min(availableQuantity, remainingQuantity));
    const unitCost = toNumber(layer.unitCost);
    const consumptionCost = roundCurrency(consumeQuantity * unitCost);

    consumptions.push({
      layerId: layer.id,
      quantity: consumeQuantity,
      unitCost,
      totalCost: consumptionCost,
    });

    remainingQuantity = roundQuantity(remainingQuantity - consumeQuantity);
    totalCost = roundCurrency(totalCost + consumptionCost);
  }

  if (remainingQuantity > 0 && !effectiveAllowNegativeStock) {
    throw new Error(
      [
        `O item ${product.name} possui ${formatQuantity(availableQuantity)} ${product.unit} disponivel(is) pelo controle FIFO, mas a operacao solicita ${formatQuantity(quantity)} ${product.unit}.`,
        "Revise o estoque, confirme uma entrada pendente ou reduza a quantidade solicitada.",
      ].join(" "),
    );
  }

  if (remainingQuantity > 0) {
    const fallbackUnitCost = toNumber(product.costPrice);
    const fallbackCost = roundCurrency(remainingQuantity * fallbackUnitCost);

    totalCost = roundCurrency(totalCost + fallbackCost);
  }

  const movement = await tx.stockMovement.create({
    data: {
      companyId: input.companyId,
      productId: input.productId,
      movementType: "OUTPUT",
      quantity,
      unitCost: quantity > 0 ? roundCurrency(totalCost / quantity) : 0,
      reasonCode: input.reasonCode,
      reasonText: normalizeEmpty(input.reasonText),
      referenceType: input.referenceType,
      referenceId: normalizeEmpty(input.referenceId),
      productionRecordId: input.productionRecordId,
      notes: normalizeEmpty(input.notes),
      occurredAt,
      createdByUserId: input.createdByUserId,
    },
  });

  for (const consumption of consumptions) {
    await tx.stockLayer.update({
      where: { id: consumption.layerId },
      data: {
        availableQuantity: {
          decrement: consumption.quantity,
        },
      },
    });

    const sourceLayer = await tx.stockLayer.findUniqueOrThrow({
      where: { id: consumption.layerId },
      select: { productId: true },
    });

    await tx.stockLayerConsumption.create({
      data: {
        companyId: input.companyId,
        productId: sourceLayer.productId,
        stockMovementId: movement.id,
        stockLayerId: consumption.layerId,
        quantityConsumed: consumption.quantity,
        unitCost: consumption.unitCost,
        totalCost: consumption.totalCost,
      },
    });
  }

  await tx.product.update({
    where: { id: input.productId },
    data: {
      currentStock: {
        decrement: quantity,
      },
    },
  });

  return {
    movement,
    quantity,
    unitCost: quantity > 0 ? roundCurrency(totalCost / quantity) : 0,
    totalCost,
    shortageQuantity: remainingQuantity,
  };
}

export async function registerOutputStockFromSpecificLayers(tx: Tx, input: SpecificLayerOutputParams) {
  const product = await tx.product.findFirst({
    where: {
      id: input.productId,
      companyId: input.companyId,
    },
  });

  if (!product) {
    throw new Error("Item nao encontrado para estorno de estoque.");
  }

  const quantity = roundQuantity(
    input.layers.reduce((sum, layer) => sum + roundQuantity(layer.quantity), 0),
  );
  const totalCost = roundCurrency(
    input.layers.reduce((sum, layer) => sum + roundCurrency(layer.quantity * layer.unitCost), 0),
  );
  const occurredAt = input.occurredAt ?? new Date();

  const movement = await tx.stockMovement.create({
    data: {
      companyId: input.companyId,
      productId: input.productId,
      movementType: "OUTPUT",
      quantity,
      unitCost: quantity > 0 ? roundCurrency(totalCost / quantity) : 0,
      reasonCode: input.reasonCode,
      reasonText: normalizeEmpty(input.reasonText),
      referenceType: input.referenceType,
      referenceId: normalizeEmpty(input.referenceId),
      productionRecordId: input.productionRecordId,
      notes: normalizeEmpty(input.notes),
      occurredAt,
      createdByUserId: input.createdByUserId,
    },
  });

  for (const layer of input.layers) {
    await tx.stockLayer.update({
      where: { id: layer.layerId },
      data: {
        availableQuantity: {
          decrement: roundQuantity(layer.quantity),
        },
      },
    });

    await tx.stockLayerConsumption.create({
      data: {
        companyId: input.companyId,
        productId: input.productId,
        stockMovementId: movement.id,
        stockLayerId: layer.layerId,
        quantityConsumed: roundQuantity(layer.quantity),
        unitCost: roundCurrency(layer.unitCost),
        totalCost: roundCurrency(layer.quantity * layer.unitCost),
      },
    });
  }

  await tx.product.update({
    where: { id: input.productId },
    data: {
      currentStock: {
        decrement: quantity,
      },
    },
  });

  return {
    movement,
    quantity,
    totalCost,
  };
}

export function roundQuantity(value: number) {
  return Math.round(value * 1000) / 1000;
}

export function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

export function toNumber(value: { toNumber(): number } | number) {
  return typeof value === "number" ? value : value.toNumber();
}

export function normalizeEmpty(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(value);
}
