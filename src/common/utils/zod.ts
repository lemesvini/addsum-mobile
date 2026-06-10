import { z } from "zod";

export const defaultRequiredError = {
  required_error: "Esse campo é obrigatório",
  message: "Esse campo é obrigatório",
  invalid_type_error: "Esse campo é obrigatório",
};

const getMinLengthError = (min: number) => {
  if (min === 1) {
    return { message: "Esse campo é obrigatório" };
  }
  return {
    message: `Esse campo deve ter no mínimo ${min} caracteres`,
  };
};

const getMaxLengthError = (max: number) => ({
  message: `Esse campo deve ter no máximo ${max} caracteres`,
});

type CustomStringValidationProps = {
  min?: number;
  max?: number;
};

export function requiredStringValidation({
  max = 255,
  min = 1,
}: CustomStringValidationProps = {}) {
  return z
    .string(defaultRequiredError)
    .min(min, getMinLengthError(min))
    .max(max, getMaxLengthError(max));
}

export const sanitizeToDigits = (value: string) => value.replace(/\D/g, "");

export const validateCnpj = (value: string) => {
  if (!/^\d{14}$/.test(value)) return false;
  if (/^(\d)\1{13}$/.test(value)) return false;

  const calculateCheckDigit = (digits: string, weights: number[]) => {
    const sum = digits
      .split("")
      .reduce((acc, digit, index) => acc + Number(digit) * weights[index], 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const base = value.slice(0, 12);
  const firstDigit = calculateCheckDigit(
    base,
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );
  const secondDigit = calculateCheckDigit(
    `${base}${firstDigit}`,
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );

  return value.endsWith(`${firstDigit}${secondDigit}`);
};

/** Trim string; empty becomes undefined (filters, optional fields). */
export const emptyToUndefined = (value: unknown) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};
