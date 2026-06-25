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
        select: {
          id: true,
          movementType: true,
          status: true,
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
      inventoryEntryItems: {
        where: {
          inventoryEntry: {
            status: "CANCELED",
          },
        },
        select: {
          inventoryEntryId: true,
        },
      },
    },
    orderBy: [{ companyId: "asc" }, { name: "asc" }],
  });

  const rows = products
    .map((product) => {
      const currentStock = toNumber(product.currentStock);
      const confirmedMoves = product.stockMoves.filter((movement) => movement.status === "CONFIRMED");
      const reversedMoves = product.stockMoves.filter((movement) => movement.status === "REVERSED");
      const movementBalance = roundQuantity(
        confirmedMoves.reduce((sum, movement) => {
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
      const origemProvavel = describeLikelyOrigin({
        currentStock,
        movementBalance,
        fifoAvailable,
        fifoOriginal,
        reversedMoves: reversedMoves.length,
      });
      const acaoRecomendada = describeRecommendedAction({
        currentStock,
        movementBalance,
        fifoAvailable,
      });

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
        movimentosConfirmados: confirmedMoves.length,
        movimentosEstornados: reversedMoves.length,
        camadasFifo: product.stockLayers.length,
        entradasCanceladasRelacionadas: product.inventoryEntryItems.length,
        origemProvavel,
        acaoRecomendada,
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

function describeLikelyOrigin({
  currentStock,
  movementBalance,
  fifoAvailable,
  fifoOriginal,
  reversedMoves,
}) {
  if (currentStock > 0 && movementBalance === currentStock && fifoAvailable === 0) {
    return "Saldo legado sem camada FIFO disponivel";
  }

  if (Math.abs(currentStock - movementBalance) > 0.0001) {
    return "Saldo cadastral divergente dos movimentos confirmados";
  }

  if (fifoOriginal > 0 && fifoAvailable < movementBalance) {
    return reversedMoves > 0
      ? "Camadas FIFO estornadas ou consumidas sem recomposicao equivalente"
      : "Camadas FIFO abaixo do saldo projetado";
  }

  return "Revisar entradas, estornos e ajustes administrativos do item";
}

function describeRecommendedAction({
  currentStock,
  movementBalance,
  fifoAvailable,
}) {
  if (currentStock > 0 && movementBalance === currentStock && fifoAvailable === 0) {
    return "Regularizar com documento auditavel de saldo inicial ou entrada para recriar as camadas FIFO";
  }

  if (Math.abs(currentStock - movementBalance) > 0.0001) {
    return "Conferir movimentos confirmados, estornos e ajustes antes de vender ou produzir";
  }

  if (fifoAvailable < movementBalance) {
    return "Revisar entradas confirmadas, camadas disponiveis e cancelar documentos apenas com recomposicao rastreavel";
  }

  return "Revisar manualmente o historico do item antes de liberar a operacao";
}
