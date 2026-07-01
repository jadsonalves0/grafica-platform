export type ParsedNfeDocument = {
  accessKey: string | null;
  number: string;
  series: string | null;
  issuedAt: string | null;
  receivedAt: string | null;
  supplierName: string | null;
  supplierDocument: string | null;
  totalAmount: number;
  productsAmount: number;
  freightAmount: number;
  discountAmount: number;
  natureOfOperation: string | null;
  protocol: string | null;
  items: ParsedNfeItem[];
  warnings: string[];
};

export type ParsedNfeItem = {
  lineNumber: number | null;
  supplierProductCode: string | null;
  description: string;
  ean: string | null;
  ncm: string | null;
  cfop: string | null;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  additionalInfo: string | null;
};

export function parseNfeXml(xmlContent: string): ParsedNfeDocument {
  const xml = normalizeXml(xmlContent);
  const warnings: string[] = [];

  if (!xml.includes("<")) {
    throw new Error(
      "Nao foi possivel ler o XML informado. Verifique se o arquivo e um XML valido de NF-e e tente novamente.",
    );
  }

  const accessKey =
    readTag(xml, "chNFe") ??
    extractAccessKeyFromId(readAttribute(xml, "infNFe", "Id")) ??
    null;
  const number = readTag(xml, "nNF");
  const series = readTag(xml, "serie");
  const issuedAt = normalizeDateString(readTag(xml, "dhEmi") ?? readTag(xml, "dEmi"));
  const receivedAt = normalizeDateString(readTag(xml, "dhSaiEnt") ?? readTag(xml, "dSaiEnt"));
  const supplierName = readTag(xml, "xNome");
  const supplierDocument = normalizeDocument(readTag(xml, "CNPJ") ?? readTag(xml, "CPF"));
  const totalAmount = parseDecimalValue(readTagFromBlock(xml, "ICMSTot", "vNF"));
  const productsAmount = parseDecimalValue(readTagFromBlock(xml, "ICMSTot", "vProd"));
  const freightAmount = parseDecimalValue(readTagFromBlock(xml, "ICMSTot", "vFrete"));
  const discountAmount = parseDecimalValue(readTagFromBlock(xml, "ICMSTot", "vDesc"));
  const natureOfOperation = readTag(xml, "natOp");
  const protocol = readTag(xml, "nProt");

  if (!number) {
    throw new Error(
      "Nao foi possivel ler o XML informado. Verifique se o arquivo e um XML valido de NF-e e tente novamente.",
    );
  }

  const items = extractItemBlocks(xml).map((itemBlock) => {
    const productBlock = readBlock(itemBlock.block, "prod") ?? itemBlock.block;
    const description = readTag(productBlock, "xProd");

    if (!description) {
      warnings.push(`O item ${itemBlock.lineNumber ?? "?"} veio sem descricao legivel no XML.`);
    }

    return {
      lineNumber: itemBlock.lineNumber,
      supplierProductCode: readTag(productBlock, "cProd"),
      description: description ?? "Item sem descricao",
      ean: normalizeReference(readTag(productBlock, "cEAN") ?? readTag(productBlock, "cEANTrib")),
      ncm: normalizeReference(readTag(productBlock, "NCM")),
      cfop: normalizeReference(readTag(productBlock, "CFOP")),
      unit: readTag(productBlock, "uCom") ?? "un",
      quantity: parseDecimalValue(readTag(productBlock, "qCom")),
      unitPrice: parseDecimalValue(readTag(productBlock, "vUnCom")),
      totalPrice: parseDecimalValue(readTag(productBlock, "vProd")),
      additionalInfo: normalizeText(readTag(itemBlock.block, "infAdProd")),
    };
  });

  if (!items.length) {
    throw new Error(
      "Nao foi possivel ler o XML informado. Verifique se o arquivo e um XML valido de NF-e e tente novamente.",
    );
  }

  return {
    accessKey,
    number,
    series,
    issuedAt,
    receivedAt,
    supplierName,
    supplierDocument,
    totalAmount,
    productsAmount,
    freightAmount,
    discountAmount,
    natureOfOperation,
    protocol,
    items,
    warnings,
  };
}

function normalizeXml(value: string) {
  return value
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .trim();
}

function extractItemBlocks(xml: string) {
  const matcher = /<(?:\w+:)?det\b[^>]*nItem="(\d+)"[^>]*>([\s\S]*?)<\/(?:\w+:)?det>/g;
  const items: Array<{ lineNumber: number | null; block: string }> = [];
  let match: RegExpExecArray | null;

  while ((match = matcher.exec(xml)) !== null) {
    items.push({
      lineNumber: Number.parseInt(match[1], 10) || null,
      block: match[2],
    });
  }

  if (items.length > 0) {
    return items;
  }

  const fallbackMatcher = /<(?:\w+:)?det\b[^>]*>([\s\S]*?)<\/(?:\w+:)?det>/g;
  while ((match = fallbackMatcher.exec(xml)) !== null) {
    items.push({
      lineNumber: null,
      block: match[1],
    });
  }

  return items;
}

function readTag(xml: string, tagName: string) {
  const pattern = new RegExp(`<(?:\\w+:)?${tagName}>([\\s\\S]*?)<\\/(?:\\w+:)?${tagName}>`, "i");
  const match = xml.match(pattern);
  return normalizeText(match?.[1] ?? null);
}

function readAttribute(xml: string, tagName: string, attributeName: string) {
  const pattern = new RegExp(
    `<(?:\\w+:)?${tagName}\\b[^>]*${attributeName}="([^"]+)"[^>]*>`,
    "i",
  );
  const match = xml.match(pattern);
  return normalizeText(match?.[1] ?? null);
}

function readBlock(xml: string, tagName: string) {
  const pattern = new RegExp(
    `<(?:\\w+:)?${tagName}\\b[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${tagName}>`,
    "i",
  );
  const match = xml.match(pattern);
  return match?.[1] ?? null;
}

function readTagFromBlock(xml: string, blockTagName: string, valueTagName: string) {
  const block = readBlock(xml, blockTagName);
  if (!block) {
    return null;
  }

  return readTag(block, valueTagName);
}

function normalizeText(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const decoded = value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  return decoded || null;
}

function normalizeReference(value: string | null | undefined) {
  const normalized = normalizeText(value);
  if (!normalized || normalized === "SEM GTIN") {
    return null;
  }

  return normalized;
}

function normalizeDocument(value: string | null | undefined) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  const digits = normalized.replace(/\D/g, "");
  return digits || null;
}

function normalizeDateString(value: string | null | undefined) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  const parsedDate = new Date(normalized);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.toISOString();
}

function parseDecimalValue(value: string | null | undefined) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return 0;
  }

  const decimal = Number.parseFloat(normalized.replace(",", "."));
  return Number.isFinite(decimal) ? Math.round(decimal * 1000) / 1000 : 0;
}

function extractAccessKeyFromId(value: string | null | undefined) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  const match = normalized.match(/NFe(\d{44})/i);
  return match?.[1] ?? null;
}
