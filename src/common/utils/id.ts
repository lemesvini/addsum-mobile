/**
 * Generates a 24-character hex string compatible with MongoDB ObjectId format.
 * Used as the local _id when creating documents offline.
 * The same _id is sent to the server on POST /sync/:slug, so no backfill is needed.
 */
export function generateObjectIdHex(): string {
  const timestamp = Math.floor(Date.now() / 1000)
    .toString(16)
    .padStart(8, "0");
  const random = Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join("");
  return timestamp + random;
}

/**
 * Generates a unique queue entry id for the syncQueue outbox.
 * Format: q_<hex timestamp>_<random hex>
 */
export function generateQueueId(): string {
  return `q_${Date.now().toString(16)}_${Array.from({ length: 12 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join("")}`;
}
