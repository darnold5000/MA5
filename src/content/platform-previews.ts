export type PlatformPreviewItem = {
  id: string;
  title: string;
  branch: string;
  summary: string;
  evaluates: string[];
  /** Vercel preview URL when available; null means not deployed yet */
  href: string | null;
  status: "foundation" | "planned" | "preview-ready" | "built";
};

/**
 * Internal comparison catalog for /platform-preview.
 * Update `href` values when each demo branch gets a Vercel preview deployment.
 * Do not add this route to public navigation.
 */
export const platformPreviews: PlatformPreviewItem[] = [
  {
    id: "foundation",
    title: "Platform foundation",
    branch: "feature/platform-foundation",
    summary:
      "Shared authentication, roles, Supabase schema, client/admin shells, and this preview hub — without changing the public marketing site.",
    evaluates: [
      "Auth + multi-role model",
      "App / admin route shells",
      "Database foundation (ma5_*)",
    ],
    href: "https://ma5.hiresignalworks.com",
    status: "preview-ready",
  },
  {
    id: "mindbody",
    title: "Mindbody replacement",
    branch: "demo/mindbody-replacement",
    summary:
      "Native booking, memberships, packages, Stripe payments, billing portal, and client schedule management.",
    evaluates: [
      "Can MA5 leave Mindbody for core ops?",
      "Checkout + subscriptions",
      "Client booking UX",
    ],
    href: null,
    status: "built",
  },
  {
    id: "external-training",
    title: "External training platforms",
    branch: "demo/external-training-platform",
    summary:
      "MA5 owns booking and billing while TrainHeroic / Trainerize remain the programming tools — shown as clearly labeled placeholders when APIs are unavailable.",
    evaluates: [
      "Hybrid ops model",
      "Client handoff UX",
      "What still needs native programs",
    ],
    href: null,
    status: "planned",
  },
  {
    id: "programs",
    title: "MA5 programs",
    branch: "main",
    summary:
      "Exercise library (native upload + YouTube/Vimeo), workout builder, program grids, Teams, assignment/publish, and client workout player.",
    evaluates: [
      "Replace TrainHeroic / Trainerize",
      "Video + workout player",
      "Teams + assignment workflow",
    ],
    href: "/admin/programs",
    status: "built",
  },
  {
    id: "messaging",
    title: "MA5 messaging",
    branch: "demo/ma5-messaging",
    summary:
      "Coach–client conversations, group announcements, in-app notifications, and preferences.",
    evaluates: [
      "Coach communication",
      "Announcement reach",
      "Notification channels",
    ],
    href: null,
    status: "planned",
  },
  {
    id: "analytics-ai",
    title: "Analytics + AI",
    branch: "demo/ma5-analytics-ai",
    summary:
      "Revenue, attendance, retention, utilization, program engagement, and AI-generated business insights.",
    evaluates: [
      "Owner decision support",
      "Retention signals",
      "AI summary usefulness",
    ],
    href: null,
    status: "planned",
  },
];
