import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function toNumber(value) {
  return typeof value === "number" ? value : Number(value);
}

async function main() {
  const products = await prisma.product.findMany({
    where: {
      controlsStock: true,
      currentStock: {
        gt: 0,
      },
    },
    select: {
      id: true,
      name: true,
      companyId: true,
      currentStock: true,
      stockLayers: {
        select: {
          id: true,
          availableQuantity: true,
        },
      },
      stockLayerConsumptions: {
        select: {
          id: true,
        },
      },
      stockMoves: {
        where: {
          status: "CONFIRMED",
        },
        orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          inventoryEntryId: true,
          companyId: true,
          productId: true,
          movementType: true,
          quantity: true,
          unitCost: true,
          occurredAt: true,
          fifoLayer: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  });

  const report = [];

  for (const product of products) {
    const currentStock = toNumber(product.currentStock);
    const fifoAvailable = product.stockLayers.reduce(
      (sum, layer) => sum + toNumber(layer.availableQuantity),
      0,
    );

    if (Math.abs(currentStock - fifoAvailable) < 0.0001) {
      continue;
    }

    const confirmedOutputs = product.stockMoves.filter(
      (movement) => movement.movementType === "OUTPUT",
    );
    const candidateInputs = product.stockMoves.filter(
      (movement) =>
        movement.movementType === "INPUT" &&
        !movement.fifoLayer &&
        movement.unitCost !== null &&
        toNumber(movement.quantity) > 0,
    );

    if (!candidateInputs.length) {
      report.push({
        product: product.name,
        action: "skipped",
        reason: "Nenhum movimento de entrada confirmado sem camada FIFO para reaproveitar.",
      });
      continue;
    }

    if (confirmedOutputs.length || product.stockLayerConsumptions.length) {
      report.push({
        product: product.name,
        action: "skipped",
        reason:
          "Produto possui saidas ou consumos ja registrados. Exige regularizacao manual antes do backfill.",
      });
      continue;
    }

    const createdLayers = [];

    for (const movement of candidateInputs) {
      const layer = await prisma.stockLayer.create({
        data: {
          companyId: movement.companyId,
          productId: movement.productId,
          inventoryEntryId: movement.inventoryEntryId,
          stockMovementId: movement.id,
          entryDate: movement.occurredAt,
          originalQuantity: toNumber(movement.quantity),
          availableQuantity: toNumber(movement.quantity),
          unitCost: toNumber(movement.unitCost),
        },
      });

      createdLayers.push({
        movementId: movement.id,
        layerId: layer.id,
        quantity: toNumber(movement.quantity),
        unitCost: toNumber(movement.unitCost),
      });
    }

    report.push({
      product: product.name,
      action: "backfilled",
      createdLayers,
    });
  }

  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
