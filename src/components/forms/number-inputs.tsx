"use client";

import { useMemo, useState } from "react";

import {
  canonicalizeCurrencyInput,
  canonicalizeDecimalInput,
  canonicalizePercentageInput,
  formatCurrencyDisplay,
  formatDecimalValue,
  formatPercentageDisplay,
  formatCurrencyInput,
  normalizeDecimalInput,
  normalizePercentageInput,
} from "@/lib/forms/br-utils";

type SharedInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "inputMode"
> & {
  value: string;
  onChange: (value: string) => void;
};

type DecimalInputProps = SharedInputProps & {
  scale?: number;
  fixedScaleOnBlur?: boolean;
};

export function MoneyInput({ value, onChange, onBlur, onFocus, ...props }: Readonly<SharedInputProps>) {
  return (
    <LocalizedNumberInput
      {...props}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      onFocus={onFocus}
      normalizeValue={formatCurrencyInput}
      normalizeBlurValue={canonicalizeCurrencyInput}
      renderBlurValue={(nextValue) => (nextValue ? formatCurrencyDisplay(nextValue) : "")}
    />
  );
}

export function PercentageInput({
  value,
  onChange,
  onBlur,
  onFocus,
  ...props
}: Readonly<SharedInputProps>) {
  return (
    <LocalizedNumberInput
      {...props}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      onFocus={onFocus}
      normalizeValue={normalizePercentageInput}
      normalizeBlurValue={canonicalizePercentageInput}
      renderBlurValue={(nextValue) => (nextValue ? formatPercentageDisplay(nextValue) : "")}
    />
  );
}

export function DecimalInput({
  value,
  onChange,
  scale = 3,
  fixedScaleOnBlur = false,
  onBlur,
  onFocus,
  ...props
}: Readonly<DecimalInputProps>) {
  return (
    <LocalizedNumberInput
      {...props}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      onFocus={onFocus}
      normalizeValue={(nextValue) => normalizeDecimalInput(nextValue, scale)}
      normalizeBlurValue={(nextValue) => canonicalizeDecimalInput(nextValue, scale, fixedScaleOnBlur)}
      renderBlurValue={(nextValue) =>
        nextValue
          ? formatDecimalValue(
              Number(nextValue.replace(/\./g, "").replace(",", ".")),
              scale,
              fixedScaleOnBlur,
            )
          : ""
      }
    />
  );
}

export function QuantityInput(props: Readonly<DecimalInputProps>) {
  return <DecimalInput scale={props.scale ?? 3} fixedScaleOnBlur={false} {...props} />;
}

function LocalizedNumberInput({
  value,
  onChange,
  normalizeValue,
  normalizeBlurValue,
  renderBlurValue,
  onBlur,
  onFocus,
  ...props
}: Readonly<
  SharedInputProps & {
    normalizeValue: (value: string) => string;
    normalizeBlurValue: (value: string) => string;
    renderBlurValue: (value: string) => string;
  }
>) {
  const [isFocused, setIsFocused] = useState(false);

  const displayValue = useMemo(() => {
    if (isFocused) {
      return value;
    }

    return renderBlurValue(value);
  }, [isFocused, renderBlurValue, value]);

  return (
    <input
      {...props}
      type="text"
      inputMode="decimal"
      value={displayValue}
      onFocus={(event) => {
        setIsFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setIsFocused(false);
        const normalized = normalizeBlurValue(value);
        if (normalized !== value) {
          onChange(normalized);
        }
        onBlur?.(event);
      }}
      onChange={(event) => {
        onChange(normalizeValue(event.target.value));
      }}
    />
  );
}
