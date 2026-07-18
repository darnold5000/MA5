export type AttributionTouch = {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  landingPage: string | null;
  referrer: string | null;
  capturedAt: string;
};

export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "converted"
  | "closed";
