/**
 * Pricing sourced from the public Mindbody Explore location page for
 * MA5 Fitness LLC / MA5 Performance:
 * https://www.mindbodyonline.com/explore/locations/ma5fitness-llc
 *
 * Verified via Mindbody marketplace APIs on 2026-07-14.
 * Do not invent prices — update this file when Mindbody packages change.
 */

export type PricingItem = {
  id: string;
  name: string;
  price: string;
  cadence?: string;
  detail?: string;
};

export type PricingGroup = {
  id: string;
  title: string;
  description?: string;
  items: PricingItem[];
};

export const trainingPricingGroups: PricingGroup[] = [
  {
    id: "small-group-memberships",
    title: "Small Group Training",
    description: "Month-to-month packages with recurring billing.",
    items: [
      {
        id: "sg-14",
        name: "14x a month",
        price: "$220",
        cadence: "/ month",
      },
      {
        id: "sg-12",
        name: "12x a month",
        price: "$190",
        cadence: "/ month",
      },
      {
        id: "sg-8",
        name: "8x a month",
        price: "$150",
        cadence: "/ month",
      },
      {
        id: "sg-4",
        name: "4x a month",
        price: "$100",
        cadence: "/ month",
      },
      {
        id: "sg-drop-in",
        name: "HIIT Drop-in",
        price: "$30",
        cadence: "/ session",
        detail: "Single-session small group drop-in.",
      },
      {
        id: "sg-couples",
        name: "Couples — 2x a week (6 month)",
        price: "$350",
        cadence: "/ month",
        detail: "Couples discount package billed monthly.",
      },
    ],
  },
  {
    id: "open-gym",
    title: "Open Gym Access",
    description:
      "Open gym memberships are month-to-month. A 30-day cancellation notice is required before the next billing date.",
    items: [
      {
        id: "og-standard",
        name: "Open Gym",
        price: "$65",
        cadence: "/ month",
      },
      {
        id: "og-household",
        name: "Same household (non-member)",
        price: "$50",
        cadence: "/ month",
      },
      {
        id: "og-small-group",
        name: "Small group member add-on",
        price: "$45",
        cadence: "/ month",
      },
      {
        id: "og-semi-private",
        name: "Semi-private member add-on",
        price: "$25",
        cadence: "/ month",
      },
    ],
  },
];
