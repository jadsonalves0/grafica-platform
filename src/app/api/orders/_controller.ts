import { OrderController } from "@/controllers/orders/order-controller";
import { prisma } from "@/lib/db/prisma";
import { CustomerRepository } from "@/repositories/customers/customer-repository";
import { FinancialRepository } from "@/repositories/financial/financial-repository";
import { InventoryRepository } from "@/repositories/inventory/inventory-repository";
import { OrderRepository } from "@/repositories/orders/order-repository";
import { QuoteRepository } from "@/repositories/quotes/quote-repository";
import { AuthorizationService } from "@/services/auth/authorization-service";
import { FinancialService } from "@/services/financial/financial-service";
import { OrderService } from "@/services/orders/order-service";

const authorizationService = new AuthorizationService();
const orderRepository = new OrderRepository(prisma);
const customerRepository = new CustomerRepository(prisma);
const quoteRepository = new QuoteRepository(prisma);
const financialRepository = new FinancialRepository(prisma);

export const orderController = new OrderController(
  new OrderService(
    orderRepository,
    quoteRepository,
    customerRepository,
    financialRepository,
    new FinancialService(
      financialRepository,
      customerRepository,
      new InventoryRepository(prisma),
      orderRepository,
      quoteRepository,
      authorizationService,
    ),
    authorizationService,
  ),
);
