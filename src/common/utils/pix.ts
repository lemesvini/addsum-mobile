import { sanitizeToDigits } from "@/common/utils/zod";

export type PixKeyType = "CPF" | "CNPJ" | "Telefone" | "E-mail" | "Chave aleatória";

/** Classify a Pix key by its content (CPF / CNPJ / phone / e-mail / random). */
export function getPixKeyType(value: string): PixKeyType {
  const raw = (value ?? "").trim();
  if (raw.includes("@")) return "E-mail";
  // A random (EVP) key is a UUID — has letters. Phones/CPF/CNPJ are digits-only.
  if (/[a-zA-Z]/.test(raw)) return "Chave aleatória";

  const digits = sanitizeToDigits(raw);
  if (raw.startsWith("+") || (digits.startsWith("55") && digits.length >= 12)) {
    return "Telefone";
  }
  if (digits.length === 11) return "CPF";
  if (digits.length === 14) return "CNPJ";
  if (digits.length === 10) return "Telefone";
  return "Chave aleatória";
}

/** Human-readable caption for a Pix key type. */
export function getPixKeyLabel(value: string): PixKeyType {
  return getPixKeyType(value);
}

function formatPhone(digits: string): string {
  // Drop the +55 country code if present, format the national number.
  let national = digits;
  if (national.startsWith("55") && national.length >= 12) {
    national = national.slice(2);
  }
  if (national.length === 11) {
    // Mobile: (DD) 9XXXX-XXXX
    return `(${national.slice(0, 2)}) ${national.slice(2, 7)}-${national.slice(7)}`;
  }
  if (national.length === 10) {
    // Landline: (DD) XXXX-XXXX
    return `(${national.slice(0, 2)}) ${national.slice(2, 6)}-${national.slice(6)}`;
  }
  return digits;
}

/**
 * Format a Pix key for display based on what it is:
 * - e-mail → trimmed as-is
 * - random/EVP key (UUID) → trimmed as-is
 * - phone → `(DD) 9XXXX-XXXX` (country code dropped)
 * - CPF → `000.000.000-00`
 * - CNPJ → `00.000.000/0000-00`
 *
 * Display only — copy the raw key, not this string.
 */
export function formatPixKey(value: string): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";

  const type = getPixKeyType(raw);
  const digits = sanitizeToDigits(raw);

  switch (type) {
    case "Telefone":
      return formatPhone(digits);
    case "CPF":
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
    case "CNPJ":
      return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
    case "E-mail":
    case "Chave aleatória":
    default:
      return raw;
  }
}
