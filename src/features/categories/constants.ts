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
