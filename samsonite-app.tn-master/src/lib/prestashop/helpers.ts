export const decodeHtmlEntities = (value: string): string =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

export const getLangValue = (
  field?: { id: string; value: string }[],
  langId = "1"
): string => {
  if (!field) return "";

  const normalize = (value?: string) => (value || "").trim();
  const requested = field.find((f) => f.id === langId);
  const requestedValue = normalize(requested?.value);
  if (requestedValue) return requestedValue;

  const firstNonEmpty = field.find((f) => normalize(f.value));
  if (firstNonEmpty) return normalize(firstNonEmpty.value);

  return normalize(field[0]?.value);
};
