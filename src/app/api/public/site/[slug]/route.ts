import { NextResponse } from "next/server";

import { SiteController } from "@/controllers/site/site-controller";
import { prisma } from "@/lib/db/prisma";
import { CompanyRepository } from "@/repositories/companies/company-repository";
import { CustomerRepository } from "@/repositories/customers/customer-repository";
import { QuoteRepository } from "@/repositories/quotes/quote-repository";
import { SiteRepository } from "@/repositories/site/site-repository";
import { AuthorizationService } from "@/services/auth/authorization-service";
import { SiteService } from "@/services/site/site-service";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

const controller = new SiteController(
  new SiteService(
    new SiteRepository(prisma),
    new CompanyRepository(prisma),
    new CustomerRepository(prisma),
    new QuoteRepository(prisma),
    new AuthorizationService(),
  ),
);

export async function GET(_: Request, routeContext: RouteContext) {
  const { slug } = await routeContext.params;
  const result = await controller.publicSite(slug);
  return NextResponse.json(result, { status: result.success ? 200 : 404 });
}
