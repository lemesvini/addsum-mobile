/**
 * Default expense categories seeded into every new group (client-side, so they
 * exist offline immediately and share their client-generated _ids with the
 * server on push). The `key` maps to the prototype's category enum / icon set.
 */
export const DEFAULT_CATEGORIES: { key: string; name: string }[] = [
  { key: "food", name: "Alimentação" },
  { key: "transport", name: "Transporte" },
  { key: "housing", name: "Moradia" },
  { key: "entertainment", name: "Lazer" },
  { key: "other", name: "Outros" },
];

/** Maps a category name to a display color (emerald-family + accents). */
export function categoryColor(name: string): string {
  switch (name) {
    case "Alimentação":
      return "#F59E0B";
    case "Transporte":
      return "#3B82F6";
    case "Moradia":
      return "#8B5CF6";
    case "Lazer":
      return "#EC4899";
    default:
      return "#6B7280";
  }
}
