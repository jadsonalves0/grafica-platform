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
  const digits = String(value).replace(/\D/g, "");
  const normalized = digits ? Number(digits) / 100 : 0;

  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(normalized);
}

export function formatCurrencyValue(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

export function parseCurrencyInput(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeDecimalInput(value: string, decimalPlaces = 3) {
  const prepared = value.replace(/\./g, ",").replace(/[^\d,]/g, "");
  if (!prepared) {
    return "";
  }

  const [integerPartRaw, ...decimalParts] = prepared.split(",");
  const integerPart = integerPartRaw.replace(/^0+(?=\d)/, "");
  const safeInteger = integerPart || (integerPartRaw ? "0" : "");

  if (decimalParts.length === 0) {
    return safeInteger;
  }

  const decimals = decimalParts.join("").slice(0, decimalPlaces);
  return `${safeInteger},${decimals}`;
}

export function parseDecimalInput(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
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
