export type SiteLeadTrackingContext = {
  origin: string;
  pageUrl?: string;
  pagePath?: string;
  referrerUrl?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
};

type LeadContextInput = {
  href?: string;
  pathname?: string;
  search?: string;
  referrer?: string;
};

export function extractSiteLeadTrackingContext(
  input: LeadContextInput,
): SiteLeadTrackingContext {
  const origin = "website";
  const pageUrl = normalizeUrl(input.href);
  const pagePath = normalizePath(input.pathname, input.search, pageUrl);
  const sourceUrl = resolveUrl(pageUrl, input.pathname, input.search);
  const referrerUrl = normalizeUrl(input.referrer);

  return {
    origin,
    ...(pageUrl ? { pageUrl } : {}),
    ...(pagePath ? { pagePath } : {}),
    ...(referrerUrl ? { referrerUrl } : {}),
    ...(sourceUrl?.searchParams.get("utm_source")
      ? { utmSource: sourceUrl.searchParams.get("utm_source") as string }
      : {}),
    ...(sourceUrl?.searchParams.get("utm_medium")
      ? { utmMedium: sourceUrl.searchParams.get("utm_medium") as string }
      : {}),
    ...(sourceUrl?.searchParams.get("utm_campaign")
      ? { utmCampaign: sourceUrl.searchParams.get("utm_campaign") as string }
      : {}),
    ...(sourceUrl?.searchParams.get("utm_content")
      ? { utmContent: sourceUrl.searchParams.get("utm_content") as string }
      : {}),
    ...(sourceUrl?.searchParams.get("utm_term")
      ? { utmTerm: sourceUrl.searchParams.get("utm_term") as string }
      : {}),
  };
}

export function formatSiteLeadReference(leadId?: string) {
  if (!leadId) {
    return "";
  }

  return `WEB-${leadId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

function normalizeUrl(value?: string) {
  if (!value) {
    return undefined;
  }

  try {
    return new URL(value).toString();
  } catch {
    return undefined;
  }
}

function resolveUrl(pageUrl?: string, pathname?: string, search?: string) {
  if (pageUrl) {
    try {
      return new URL(pageUrl);
    } catch {
      return undefined;
    }
  }

  if (!pathname) {
    return undefined;
  }

  try {
    return new URL(`${pathname}${search || ""}`, "https://example.local");
  } catch {
    return undefined;
  }
}

function normalizePath(pathname?: string, search?: string, pageUrl?: string) {
  if (pathname) {
    return `${pathname}${search || ""}`.slice(0, 255);
  }

  if (!pageUrl) {
    return undefined;
  }

  try {
    const url = new URL(pageUrl);
    return `${url.pathname}${url.search}`.slice(0, 255);
  } catch {
    return undefined;
  }
}
