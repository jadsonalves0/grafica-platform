import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SiteHomeView } from "@/components/site/site-home-view";
import { SiteController } from "@/controllers/site/site-controller";
import { prisma } from "@/lib/db/prisma";
import { getSiteMetaDescription, getSiteMetaTitle } from "@/lib/site/site-home";
import { CompanyRepository } from "@/repositories/companies/company-repository";
import { CustomerRepository } from "@/repositories/customers/customer-repository";
import { QuoteRepository } from "@/repositories/quotes/quote-repository";
import { SiteRepository } from "@/repositories/site/site-repository";
import { AuthorizationService } from "@/services/auth/authorization-service";
import { SiteService } from "@/services/site/site-service";

type CompanySitePageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

const publicBaseUrl = new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");

function buildController() {
  return new SiteController(
    new SiteService(
      new SiteRepository(prisma),
      new CompanyRepository(prisma),
      new CustomerRepository(prisma),
      new QuoteRepository(prisma),
      new AuthorizationService(),
    ),
  );
}

async function loadSite(slug: string) {
  const controller = buildController();
  const result = await controller.publicSite(slug);

  if (!result.success || !result.data) {
    return null;
  }

  return result.data;
}

export async function generateMetadata({
  params,
}: CompanySitePageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadSite(slug);

  if (!data) {
    return {
      title: "Site nao encontrado | Grafica Platform",
      description: "O endereco publico informado nao esta disponivel.",
    };
  }

  const title = getSiteMetaTitle(data);
  const description = getSiteMetaDescription(data);
  const image =
    data.home.socialImageUrl ||
    data.home.heroImageUrl ||
    data.banners[0]?.imageUrl ||
    data.services[0]?.imageUrl ||
    undefined;

  return {
    metadataBase: publicBaseUrl,
    title,
    description,
    alternates: {
      canonical: new URL(`/${slug}`, publicBaseUrl).toString(),
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: new URL(`/${slug}`, publicBaseUrl).toString(),
      images: image ? [{ url: image, alt: data.company.tradeName }] : undefined,
    },
    icons: data.settings?.faviconUrl ? { icon: data.settings.faviconUrl } : undefined,
  };
}

export default async function CompanySitePage({
  params,
  searchParams,
}: Readonly<CompanySitePageProps>) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({} as Record<string, string | string[] | undefined>),
  ]);
  const site = await loadSite(slug);

  if (!site) {
    notFound();
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: site.company.tradeName,
    url: new URL(`/${site.company.slug}`, publicBaseUrl).toString(),
    email: site.settings?.contactEmail || undefined,
    telephone: site.settings?.contactWhatsapp || site.settings?.contactPhone || undefined,
    address: site.settings?.addressFull || undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteHomeView
        data={site}
        leadForm={{
          companyId: site.company.id,
          companyName: site.company.tradeName,
          initialRequestedService:
            typeof resolvedSearchParams.servico === "string"
              ? resolvedSearchParams.servico
              : "",
          whatsapp: site.settings?.contactWhatsapp,
        }}
      />
    </>
  );
}
