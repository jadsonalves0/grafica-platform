import { NextResponse } from "next/server";

import { SiteController } from "@/controllers/site/site-controller";
import { prisma } from "@/lib/db/prisma";
import { CompanyRepository } from "@/repositories/companies/company-repository";
import { CustomerRepository } from "@/repositories/customers/customer-repository";
import { QuoteRepository } from "@/repositories/quotes/quote-repository";
import { SiteRepository } from "@/repositories/site/site-repository";
import { AuthorizationService } from "@/services/auth/authorization-service";
import { SiteService } from "@/services/site/site-service";

const controller = new SiteController(
  new SiteService(
    new SiteRepository(prisma),
    new CompanyRepository(prisma),
    new CustomerRepository(prisma),
    new QuoteRepository(prisma),
    new AuthorizationService(),
  ),
);

export async function POST(request: Request) {
  const body = await request.json();
  const result = await controller.createLead(body);
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
