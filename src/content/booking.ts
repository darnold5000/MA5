import { env, type BookingWidgetKey } from "@/lib/env";

export type BookingOption = {
  key: BookingWidgetKey | "sports-performance" | "open-gym";
  label: string;
  description: string;
  query: string;
  widgetId?: string;
};

export const bookingOptions: BookingOption[] = [
  {
    key: "assessment",
    label: "Fitness Assessment",
    description: "Start here if you are new to MA5 or returning after time away.",
    query: "assessment",
    widgetId: env.mindbodyWidgets.assessment,
  },
  {
    key: "group",
    label: "Small Group Training",
    description: "View group session availability and reserve your spot.",
    query: "small-group",
    widgetId: env.mindbodyWidgets.group,
  },
  {
    key: "sports-performance",
    label: "Sports Performance",
    description: "Book athlete-focused training and performance sessions.",
    query: "sports-performance",
    // TODO: Map to the correct Mindbody widget once embed codes are provided.
    widgetId: undefined,
  },
  {
    key: "inbody",
    label: "InBody Scan",
    description: "Schedule a body composition scan.",
    query: "inbody",
    widgetId: env.mindbodyWidgets.inbody,
  },
  {
    key: "sauna",
    label: "Infrared Sauna",
    description: "Reserve recovery time in the infrared sauna.",
    query: "sauna",
    widgetId: env.mindbodyWidgets.sauna,
  },
  {
    key: "open-gym",
    label: "Open Gym",
    description: "Check open-gym access options and availability.",
    query: "open-gym",
    // TODO: Map to the correct Mindbody widget once embed codes are provided.
    widgetId: undefined,
  },
];

export function getBookingOption(type?: string | null) {
  if (!type) {
    return bookingOptions[0];
  }

  return (
    bookingOptions.find((option) => option.query === type) ?? bookingOptions[0]
  );
}
