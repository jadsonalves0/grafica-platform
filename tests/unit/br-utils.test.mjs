import assert from "node:assert/strict";

import {
  canonicalizeCurrencyInput,
  canonicalizePercentageInput,
  formatCurrencyDisplay,
  normalizeDecimalInput,
  parseCurrencyInput,
  parseDecimalInput,
  parsePercentageInput,
} from "../../src/lib/forms/br-utils.ts";

export const cases = [
  {
    name: "aceita moeda com zeros e virgula em pt-BR",
    run() {
      assert.equal(parseCurrencyInput("10,00"), 10);
      assert.equal(parseCurrencyInput("10,05"), 10.05);
      assert.equal(parseCurrencyInput("0,50"), 0.5);
      assert.equal(canonicalizeCurrencyInput("100,5"), "100,50");
    },
  },
  {
    name: "normaliza colagem de moeda com simbolo e ponto decimal",
    run() {
      assert.equal(parseCurrencyInput("R$ 10,50"), 10.5);
      assert.equal(parseCurrencyInput("10.50"), 10.5);
      assert.equal(parseCurrencyInput("1.250,75"), 1250.75);
      assert.equal(formatCurrencyDisplay("1250,75"), "R$ 1.250,75");
    },
  },
  {
    name: "mantem decimal natural durante digitacao",
    run() {
      assert.equal(normalizeDecimalInput("10,050"), "10,050");
      assert.equal(normalizeDecimalInput("0,500"), "0,500");
      assert.equal(parseDecimalInput("12,345"), 12.345);
    },
  },
  {
    name: "normaliza e interpreta percentual com ate duas casas",
    run() {
      assert.equal(parsePercentageInput("5"), 5);
      assert.equal(parsePercentageInput("5,25"), 5.25);
      assert.equal(canonicalizePercentageInput("12,5"), "12,50");
    },
  },
];
