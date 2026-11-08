/** Match recipe labels without treating capitalization or edge spaces as distinct. */
export const recipeLabelKey = (value: string) => value.trim().toLowerCase();

export function uniqueRecipeLabels(values: string[]): string[] {
  const labels = new Map<string, string>();
  for (const value of values) {
    const key = recipeLabelKey(value);
    if (key && !labels.has(key)) labels.set(key, value.trim());
  }
  return [...labels.values()];
}

export function existingRecipeLabel(value: string, existing: string[]): string {
  return existing.find(label => recipeLabelKey(label) === recipeLabelKey(value))?.trim() || value.trim();
}
