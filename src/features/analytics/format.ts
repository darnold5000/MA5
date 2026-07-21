export function formatCompactMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/** Chart axis labels — values are already in whole dollars. */
export function formatChartAxisMoney(dollars: number): string {
  if (dollars >= 1000) return `$${Math.round(dollars / 1000)}k`;
  return `$${dollars}`;
}

export function capacityPercent(booked: number, capacity: number): number {
  if (capacity <= 0) return 0;
  return Math.round((booked / capacity) * 100);
}
