import assert from "node:assert/strict";

import {
  extractSiteLeadTrackingContext,
  formatSiteLeadReference,
} from "../../src/lib/site/site-lead-context.ts";

export const cases = [
  {
    name: "extrai origem pagina e utm a partir da url completa",
    run() {
      const context = extractSiteLeadTrackingContext({
        href: "https://example.com/ponto-print?utm_source=google&utm_medium=cpc&utm_campaign=inverno",
        referrer: "https://instagram.com/pontoprint",
      });

      assert.equal(context.origin, "website");
      assert.equal(context.pagePath, "/ponto-print?utm_source=google&utm_medium=cpc&utm_campaign=inverno");
      assert.equal(context.utmSource, "google");
      assert.equal(context.utmMedium, "cpc");
      assert.equal(context.utmCampaign, "inverno");
      assert.equal(context.referrerUrl, "https://instagram.com/pontoprint");
    },
  },
  {
    name: "extrai contexto a partir de pathname e search quando a url completa nao existe",
    run() {
      const context = extractSiteLeadTrackingContext({
        pathname: "/ponto-print",
        search: "?utm_source=site&utm_term=banner",
      });

      assert.equal(context.pagePath, "/ponto-print?utm_source=site&utm_term=banner");
      assert.equal(context.utmSource, "site");
      assert.equal(context.utmTerm, "banner");
    },
  },
  {
    name: "formata referencia curta do lead",
    run() {
      assert.equal(
        formatSiteLeadReference("12345678-abcd-efgh-ijkl-987654321000"),
        "WEB-12345678",
      );
    },
  },
];
