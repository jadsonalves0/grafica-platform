import type { MetadataRoute } from "next";

import { prisma } from "@/lib/db/prisma";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const companies = await prisma.company.findMany({
    include: {
      siteSettings: true,
    },
  });

  return companies
    .filter((company) => company.siteSettings?.isSitePublished)
    .map((company) => ({
      url: `${BASE_URL}/${company.slug}`,
      lastModified: company.siteSettings?.updatedAt ?? new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    }));
}
