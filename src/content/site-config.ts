export const siteConfig = {
  name: "MA5 Performance",
  shortName: "MA5",
  legalName: "MA5 Fitness LLC",
  tagline: "If it doesn't challenge you, it won't change you.",
  description:
    "NASM-certified personal training, sports performance, small-group coaching, nutrition guidance, and private open-gym access in Avon, Indiana.",
  location: {
    city: "Avon",
    state: "Indiana",
    stateAbbr: "IN",
    addressLine1: "8441 Kingston St",
    postalCode: "46123",
    fullAddress: "8441 Kingston St, Avon, IN 46123",
    // Approximate coordinates for 8441 Kingston St, Avon, IN — verify before schema publish.
    geo: {
      latitude: 39.7626,
      longitude: -86.3997,
    },
    mapsUrl:
      "https://www.google.com/maps/search/?api=1&query=8441+Kingston+St+Avon+IN+46123",
  },
  contact: {
    // No public phone number listed on the current MA5 website.
    phone: "",
    phoneDisplay: "",
    email: "ma.fitness99@gmail.com",
  },
  hours: {
    summary: "24/7 key-fob open-gym access for members; training by appointment",
    openGym: "24/7 key-fob access",
  },
  social: {
    facebook: "https://www.facebook.com/MA5Performance",
    instagram: "https://www.instagram.com/ma5_performance",
    linkedin: "https://www.linkedin.com/in/robert-anderson-818997104/",
  },
  booking: {
    // Native Fitness Hub schedule (auth required — middleware sends to login).
    // Mindbody Explore stays available as fallbackUrl.
    path: "/app/schedule",
    fallbackUrl:
      "https://www.mindbodyonline.com/explore/locations/ma5fitness-llc",
  },
  signalWorks: {
    url: "https://hiresignalworks.com",
    // "by" | "designed-and-maintained"
    creditVariant: "by" as const,
  },
  owner: {
    name: "Robert Anderson",
    // Credentials referenced on the current site meta description.
    credentials: "NASM Certified Personal Trainer & Fitness Nutrition Specialist",
    linkedin: "https://www.linkedin.com/in/robert-anderson-818997104/",
  },
  navigation: [
    { label: "Home", href: "/" },
    { label: "Training", href: "/training" },
    { label: "Sports Performance", href: "/sports-performance" },
    { label: "Open Gym", href: "/open-gym" },
    { label: "Sauna", href: "/services/infrared-sauna" },
    { label: "About", href: "/about" },
    { label: "Results", href: "/transformations" },
  ],
  footerLinks: [
    { label: "Facility", href: "/facility" },
    { label: "Contact", href: "/contact" },
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ],
} as const;

export type NavItem = (typeof siteConfig.navigation)[number];
