export type * from "./types";
export { DEMO_DAILY_OPS, DEMO_BUSINESS_REPORTS } from "./demo-data";

export function formatCompactMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function capacityPercent(booked: number, capacity: number): number {
  if (capacity <= 0) return 0;
  return Math.round((booked / capacity) * 100);
}
