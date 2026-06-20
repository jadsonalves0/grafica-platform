import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const args = new Map(
  process.argv.slice(2).map((argument) => {
    const [key, value = "true"] = argument.replace(/^--/, "").split("=");
    return [key, value];
  }),
);

const companyId = args.get("companyId");
const productId = args.get("productId");
const includeAll = args.get("all") === "true";

async function main() {
  const products = await prisma.product.findMany({
    where: {
      controlsStock: true,
      ...(companyId ? { companyId } : {}),
      ...(productId ? { id: productId } : {}),
    },
    include: {
      company: {
        select: {
          tradeName: true,
        },
      },
      stockLayers: {
        select: {
          id: true,
          originalQuantity: true,
          availableQuantity: true,
          unitCost: true,
          inventoryEntryId: true,
        },
      },
      stockMoves: {
        where: {
          status: "CONFIRMED",
        },
        select: {
          id: true,
          movementType: true,
          quantity: true,
          reasonCode: true,
          inventoryEntryId: true,
          referenceType: true,
          referenceId: true,
          occurredAt: true,
        },
      },
      stockLayerConsumptions: {
        select: {
          quantityConsumed: true,
          totalCost: true,
        },
      },
    },
    orderBy: [{ companyId: "asc" }, { name: "asc" }],
  });

  const rows = products
    .map((product) => {
      const currentStock = toNumber(product.currentStock);
      const movementBalance = roundQuantity(
        product.stockMoves.reduce((sum, movement) => {
          const quantity = toNumber(movement.quantity);
          if (movement.movementType === "INPUT") {
            return sum + quantity;
          }

          if (movement.movementType === "OUTPUT") {
            return sum - quantity;
          }

          return sum;
        }, 0),
      );
      const fifoAvailable = roundQuantity(
        product.stockLayers.reduce((sum, layer) => sum + toNumber(layer.availableQuantity), 0),
      );
      const fifoOriginal = roundQuantity(
        product.stockLayers.reduce((sum, layer) => sum + toNumber(layer.originalQuantity), 0),
      );
      const fifoConsumed = roundQuantity(
        product.stockLayerConsumptions.reduce(
          (sum, consumption) => sum + toNumber(consumption.quantityConsumed),
          0,
        ),
      );
      const missingFifo = roundQuantity(currentStock - fifoAvailable);
      const hasMismatch =
        Math.abs(currentStock - movementBalance) > 0.0001 ||
        Math.abs(currentStock - fifoAvailable) > 0.0001;

      return {
        company: product.company.tradeName,
        item: product.name,
        productId: product.id,
        unidade: product.unit,
        saldoRegistrado: currentStock,
        saldoMovimentos: movementBalance,
        saldoFifoDisponivel: fifoAvailable,
        saldoOriginalCamadas: fifoOriginal,
        saldoConsumidoFifo: fifoConsumed,
        diferencaFifo: missingFifo,
        custoReferencia: toNumber(product.costPrice),
        movimentosConfirmados: product.stockMoves.length,
        camadasFifo: product.stockLayers.length,
        divergente: hasMismatch ? "SIM" : "NAO",
      };
    })
    .filter((row) => includeAll || row.divergente === "SIM");

  if (!rows.length) {
    console.log("Nenhuma divergencia encontrada para os filtros informados.");
    return;
  }

  console.table(rows);
}

main()
  .catch((error) => {
    console.error("Nao foi possivel executar o diagnostico de estoque.");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

function toNumber(value) {
  return typeof value === "number" ? value : value.toNumber();
}

function roundQuantity(value) {
  return Math.round(value * 1000) / 1000;
}
