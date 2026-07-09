const TND_FORMATTER = new Intl.NumberFormat("fr-TN", {
  style: "currency",
  currency: "TND",
  minimumFractionDigits: 3,
});

export const formatTnd = (value: number): string => {
  return TND_FORMATTER.format(Number.isFinite(value) ? value : 0);
};
