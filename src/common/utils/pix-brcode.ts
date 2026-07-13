/**
 * Builds a Pix "copia e cola" (BR Code / EMV MPM) payload from a Pix key and an
 * optional amount, per the Banco Central spec. The resulting string can be
 * pasted into a bank app or rendered as a QR code.
 */

/** Encodes one EMV field: 2-char id + 2-digit length + value. */
function emv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

/** CRC16-CCITT (0x1021, init 0xFFFF), uppercase 4-hex, per the Pix spec. */
function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Strips accents/punctuation and upper-cases, clamped to `max` (EMV-safe). */
function sanitizeText(value: string, max: number): string {
  const cleaned = (value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .trim()
    .slice(0, max)
    .toUpperCase();
  return cleaned || "N";
}

export type BuildPixPayloadInput = {
  /** The raw Pix key (CPF/CNPJ digits, +55 phone, e-mail, or random key). */
  pixKey: string;
  /** Transaction amount in BRL; omitted/0 produces an open-value code. */
  amount?: number;
  /** Payee name (field 59, ≤25 chars). */
  merchantName: string;
  /** Payee city (field 60, ≤15 chars). */
  merchantCity?: string;
  /** Transaction id (field 62.05); defaults to "***". */
  txid?: string;
};

export function buildPixPayload({
  pixKey,
  amount,
  merchantName,
  merchantCity = "BRASIL",
  txid,
}: BuildPixPayloadInput): string {
  const merchantAccount = emv(
    "26",
    emv("00", "br.gov.bcb.pix") + emv("01", pixKey.trim()),
  );
  const amountField =
    amount != null && amount > 0 ? emv("54", amount.toFixed(2)) : "";
  const txidValue = txid ? sanitizeText(txid, 25) : "***";
  const additionalData = emv("62", emv("05", txidValue));

  const withoutCrc =
    emv("00", "01") +
    merchantAccount +
    emv("52", "0000") +
    emv("53", "986") +
    amountField +
    emv("58", "BR") +
    emv("59", sanitizeText(merchantName, 25)) +
    emv("60", sanitizeText(merchantCity, 15)) +
    additionalData +
    "6304"; // CRC id + length, value computed over everything up to here

  return withoutCrc + crc16(withoutCrc);
}
