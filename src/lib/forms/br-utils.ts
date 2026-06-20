const BRAZILIAN_STATE_CODES = new Set([
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
]);

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function normalizeDocument(value?: string) {
  return onlyDigits(value ?? "").slice(0, 14);
}

export function formatCpfCnpj(value: string) {
  const digits = normalizeDocument(value);

  if (digits.length <= 11) {
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) {
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    }
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }

  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }

  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export function isValidCpf(value: string) {
  const digits = normalizeDocument(value);

  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) {
    return false;
  }

  const numbers = digits.split("").map(Number);

  const firstCheck =
    ((numbers.slice(0, 9).reduce((sum, digit, index) => sum + digit * (10 - index), 0) * 10) % 11) %
    10;
  const secondCheck =
    ((numbers.slice(0, 10).reduce((sum, digit, index) => sum + digit * (11 - index), 0) * 10) %
      11) %
    10;

  return firstCheck === numbers[9] && secondCheck === numbers[10];
}

export function isValidCnpj(value: string) {
  const digits = normalizeDocument(value);

  if (digits.length !== 14 || /^(\d)\1+$/.test(digits)) {
    return false;
  }

  const numbers = digits.split("").map(Number);
  const firstWeights = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const secondWeights = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const firstSum = firstWeights.reduce((sum, weight, index) => sum + numbers[index] * weight, 0);
  const firstRemainder = firstSum % 11;
  const firstCheck = firstRemainder < 2 ? 0 : 11 - firstRemainder;

  const secondSum = secondWeights.reduce((sum, weight, index) => {
    const digit = index === 12 ? firstCheck : numbers[index];
    return sum + digit * weight;
  }, 0);
  const secondRemainder = secondSum % 11;
  const secondCheck = secondRemainder < 2 ? 0 : 11 - secondRemainder;

  return firstCheck === numbers[12] && secondCheck === numbers[13];
}

export function isValidCpfCnpj(value: string) {
  const digits = normalizeDocument(value);

  if (digits.length === 11) {
    return isValidCpf(digits);
  }

  if (digits.length === 14) {
    return isValidCnpj(digits);
  }

  return false;
}

export function normalizePhone(value?: string) {
  return onlyDigits(value ?? "").slice(0, 11);
}

export function formatPhone(value: string) {
  const digits = normalizePhone(value);

  if (!digits) {
    return "";
  }

  if (digits.length <= 2) {
    return `(${digits}`;
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function isValidPhone(value: string) {
  const digits = normalizePhone(value);
  return digits.length === 10 || digits.length === 11;
}

export function normalizeZipCode(value?: string) {
  return onlyDigits(value ?? "").slice(0, 8);
}

export function formatZipCode(value: string) {
  const digits = normalizeZipCode(value);
  if (digits.length <= 5) {
    return digits;
  }

  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function isValidZipCode(value: string) {
  return normalizeZipCode(value).length === 8;
}

export function normalizeStateCode(value: string) {
  return value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 2);
}

export function isValidStateCode(value: string) {
  const normalized = normalizeStateCode(value);
  return BRAZILIAN_STATE_CODES.has(normalized);
}

export function normalizeEmailInput(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function formatCurrencyInput(value: string | number) {
  if (typeof value === "number") {
    return formatLocalizedNumber(value, { scale: 2, fixedScale: true });
  }

  return normalizeLocalizedNumberInput(value, { scale: 2 });
}

export function formatCurrencyValue(value: number) {
  return formatLocalizedNumber(value, { scale: 2, fixedScale: true });
}

export function formatCurrencyDisplay(value: string | number) {
  const parsed = typeof value === "number" ? value : parseCurrencyInput(value);
  return `R$ ${formatLocalizedNumber(parsed, { scale: 2, fixedScale: true })}`;
}

export function canonicalizeCurrencyInput(value: string) {
  return canonicalizeLocalizedNumberInput(value, { scale: 2, fixedScale: true });
}

export function parseCurrencyInput(value: string) {
  return parseLocalizedNumberInput(value, { scale: 2 });
}

export function normalizeDecimalInput(value: string, decimalPlaces = 3) {
  return normalizeLocalizedNumberInput(value, { scale: decimalPlaces });
}

export function parseDecimalInput(value: string) {
  return parseLocalizedNumberInput(value, { scale: 6 });
}

export function formatDecimalValue(
  value: number,
  decimalPlaces = 3,
  fixedScale = false,
) {
  return formatLocalizedNumber(value, { scale: decimalPlaces, fixedScale });
}

export function canonicalizeDecimalInput(
  value: string,
  decimalPlaces = 3,
  fixedScale = false,
) {
  return canonicalizeLocalizedNumberInput(value, { scale: decimalPlaces, fixedScale });
}

export function normalizePercentageInput(value: string) {
  return normalizeLocalizedNumberInput(value, { scale: 2 });
}

export function parsePercentageInput(value: string) {
  return parseLocalizedNumberInput(value, { scale: 4 });
}

export function formatPercentageValue(value: number, fixedScale = true) {
  return formatLocalizedNumber(value, { scale: 2, fixedScale });
}

export function formatPercentageDisplay(value: string | number) {
  const parsed = typeof value === "number" ? value : parsePercentageInput(value);
  return `${formatLocalizedNumber(parsed, { scale: 2, fixedScale: true })}%`;
}

export function canonicalizePercentageInput(value: string) {
  return canonicalizeLocalizedNumberInput(value, { scale: 2, fixedScale: true });
}

export function normalizeSkuInput(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 40);
}

export function normalizeGtinInput(value: string) {
  return onlyDigits(value).slice(0, 14);
}

export function isValidGtin(value: string) {
  const digits = normalizeGtinInput(value);

  if (![8, 12, 13, 14].includes(digits.length) || /^(\d)\1+$/.test(digits)) {
    return false;
  }

  const values = digits.split("").map(Number);
  const checkDigit = values.at(-1);

  if (checkDigit === undefined) {
    return false;
  }

  const baseDigits = values.slice(0, -1);
  const total = baseDigits
    .reverse()
    .reduce((sum, digit, index) => sum + digit * (index % 2 === 0 ? 3 : 1), 0);
  const expected = (10 - (total % 10)) % 10;

  return expected === checkDigit;
}

export function normalizeUnitInput(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9/_-]/g, "").slice(0, 12);
}

export function normalizeReferenceInput(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9/_-]/g, "").slice(0, 80);
}

export function normalizeRoleCodeInput(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_-]/g, "_").replace(/_+/g, "_").slice(0, 60);
}

export function normalizeSlugInput(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

type LocalizedNumberOptions = {
  scale: number;
  fixedScale?: boolean;
  allowNegative?: boolean;
};

function normalizeLocalizedNumberInput(value: string, options: LocalizedNumberOptions) {
  const parts = splitLocalizedNumber(value, options);

  if (!parts.integer && !parts.decimals && !parts.hasSeparator) {
    return "";
  }

  return joinLocalizedNumber(parts, options.scale);
}

function canonicalizeLocalizedNumberInput(value: string, options: LocalizedNumberOptions) {
  const normalized = normalizeLocalizedNumberInput(value, options);

  if (!normalized) {
    return "";
  }

  return formatLocalizedNumber(parseLocalizedNumberInput(normalized, options), {
    scale: options.scale,
    fixedScale: options.fixedScale,
  });
}

function parseLocalizedNumberInput(value: string, options: LocalizedNumberOptions) {
  const normalized = normalizeLocalizedNumberInput(value, options);

  if (!normalized) {
    return 0;
  }

  const negative = normalized.startsWith("-");
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [integerPart = "0", decimals = ""] = unsigned.split(",");
  const parsed = Number(`${negative ? "-" : ""}${integerPart}.${decimals}`);

  return Number.isFinite(parsed) ? parsed : 0;
}

function formatLocalizedNumber(value: number, options: LocalizedNumberOptions) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: options.fixedScale ? options.scale : 0,
    maximumFractionDigits: options.scale,
  }).format(value || 0);
}

function splitLocalizedNumber(value: string, options: LocalizedNumberOptions) {
  const scale = Math.max(options.scale, 0);
  const raw = String(value ?? "").trim();

  if (!raw) {
    return {
      negative: false,
      integer: "",
      decimals: "",
      hasSeparator: false,
    };
  }

  let sanitized = raw
    .replace(/\s+/g, "")
    .replace(/R\$/gi, "")
    .replace(/%/g, "")
    .replace(/[^\d,.\-]/g, "");

  const negative = options.allowNegative ? sanitized.startsWith("-") : false;
  sanitized = sanitized.replace(/-/g, "");

  if (!sanitized) {
    return {
      negative,
      integer: "",
      decimals: "",
      hasSeparator: false,
    };
  }

  const lastComma = sanitized.lastIndexOf(",");
  const lastDot = sanitized.lastIndexOf(".");
  const decimalIndex = resolveDecimalIndex(sanitized, lastComma, lastDot, scale);

  const integerSource = decimalIndex >= 0 ? sanitized.slice(0, decimalIndex) : sanitized;
  const decimalSource = decimalIndex >= 0 ? sanitized.slice(decimalIndex + 1) : "";
  const integerDigits = integerSource.replace(/[^\d]/g, "");
  const normalizedInteger =
    integerDigits.replace(/^0+(?=\d)/, "") || (integerDigits || decimalSource ? "0" : "");

  return {
    negative,
    integer: normalizedInteger,
    decimals: decimalSource.replace(/[^\d]/g, "").slice(0, scale),
    hasSeparator: decimalIndex >= 0,
  };
}

function resolveDecimalIndex(value: string, lastComma: number, lastDot: number, scale: number) {
  if (lastComma >= 0 && lastDot >= 0) {
    return Math.max(lastComma, lastDot);
  }

  const separatorIndex = Math.max(lastComma, lastDot);
  if (separatorIndex < 0) {
    return -1;
  }

  const separator = value[separatorIndex];
  const occurrences = value.split(separator).length - 1;
  const digitsAfter = value.length - separatorIndex - 1;

  if (digitsAfter === 0) {
    return separatorIndex;
  }

  if (occurrences > 1) {
    return digitsAfter <= scale ? separatorIndex : -1;
  }

  if (digitsAfter <= scale) {
    return separatorIndex;
  }

  if (digitsAfter === 3 && scale === 2) {
    return -1;
  }

  return -1;
}

function joinLocalizedNumber(
  parts: {
    negative: boolean;
    integer: string;
    decimals: string;
    hasSeparator: boolean;
  },
  scale: number,
) {
  const signal = parts.negative ? "-" : "";

  if (!parts.hasSeparator || scale === 0) {
    return `${signal}${parts.integer}`;
  }

  return `${signal}${parts.integer},${parts.decimals}`;
}
